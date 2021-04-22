import { Instance, InstanceType, MachineImage, Peer, Port, SecurityGroup, UserData, Vpc } from '@aws-cdk/aws-ec2'
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup } from '@aws-cdk/aws-elasticloadbalancingv2'
import { InstanceIdTarget } from '@aws-cdk/aws-elasticloadbalancingv2-targets'
import { PolicyStatement } from '@aws-cdk/aws-iam'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'
import { CfnDatabase, CfnTable } from '@aws-cdk/aws-timestream'
import { App, CfnOutput, Construct, Duration, Fn, Stack, StackProps } from '@aws-cdk/core'
import * as path from 'path'
import { Rule, Schedule } from '@aws-cdk/aws-events'
import { LambdaFunction } from '@aws-cdk/aws-events-targets'

const BITNAMI = '979382823631'

export class MyStack extends Stack {
    private readonly checkInterval = Duration.minutes(15)

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const db = new CfnDatabase(this, 'ShipEveryMerge', {
            // databaseName: 'ShipEveryMerge'
        })

        const table = new CfnTable(this, 'Compliance', {
            databaseName: db.ref,
            // tableName: 'Compliance',
            retentionProperties: {
                MemoryStoreRetentionPeriodInHours: '24',
                MagneticStoreRetentionPeriodInDays: '365'
            }
        })
        const tableName = Fn.select(1, Fn.split('|', table.ref, 2))

        const vpc = Vpc.fromLookup(this, 'vpc', {
            vpcName: 'CN-Development'  
        })

        const ec2SecurityGroup = new SecurityGroup(this, 'grafana-ec2-sg', { vpc })
        ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22))
        ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(3000))

        const complianceDataSource = `
apiVersion: 1
datasources:
- name: Compliance
  type: "grafana-timestream-datasource"
  access: direct
  basicAuth: false
  isDefault: false
  readOnly: true
  jsonData:
    authType: default
    defaultDatabase: "\\"${db.ref}\\""
    defaultTable: "\\"${tableName}\\""
    defaultRegion: "${this.region}"
        `.trim().replace('\n', '\\n')

        const ec2Init = UserData.forLinux()
        ec2Init.addCommands(
            // enable public dashboards
            'echo -e "\n[auth.anonymous]\nenabled = true" >> /opt/bitnami/grafana/conf/grafana.ini',
            // install plugins
            'sudo grafana-cli --pluginsDir /bitnami/grafana/data/plugins plugins install grafana-timestream-datasource',
            // enable data sources
            `echo -e '${complianceDataSource}' > /bitnami/grafana/conf/provisioning/datasources/compliance.yaml`,
            // apply changes by restarting grafana
            'sudo /opt/bitnami/ctlscript.sh restart grafana'
        )

        const ec2 = new Instance(this, 'grafana', {
            // instanceName: 'grafana',
            instanceType: new InstanceType('t3.small'),
            keyName: 'sem-grafana',
            availabilityZone: 'us-east-1a',
            sourceDestCheck: true,
            vpc,
            securityGroup: ec2SecurityGroup,
            machineImage: MachineImage.lookup({
                name: 'bitnami-grafana-*',
                owners: [BITNAMI]
            }),
            userData: ec2Init
        })

        const timestreamBasePolicy = new PolicyStatement({
            actions: [
                "timestream:DescribeEndpoints",
                "timestream:CancelQuery",
                "timestream:ListDatabases",
                "timestream:SelectValues"
            ],
            resources: ['*']
            })

        const timestreamReadPolicy = new PolicyStatement({
            actions: [
                "timestream:CancelQuery",
                "timestream:DescribeDatabase",
                "timestream:DescribeTable",
                "timestream:ListMeasures",
                "timestream:ListTables",
                "timestream:ListTagsForResource",
                "timestream:Select"
            ],
            resources: [
                db.attrArn,
                table.attrArn
            ]
        })

        const timestreamWritePolicy = new PolicyStatement({
            actions: [ "timestream:*" ],
            resources: [
                db.attrArn,
                table.attrArn
            ]
        })

        ec2.grantPrincipal.addToPrincipalPolicy(timestreamBasePolicy)
        ec2.grantPrincipal.addToPrincipalPolicy(timestreamReadPolicy)

        const lbSecurityGroup = new SecurityGroup(this, 'grafana-lb-sg', { vpc })
        lbSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80))

        const lb = new ApplicationLoadBalancer(this, 'grafana-lb', {
            // loadBalancerName: 'grafana',
            vpc,
            internetFacing: true,
            securityGroup: lbSecurityGroup
        })
  
        lb.addListener('http', {
            protocol: ApplicationProtocol.HTTP,
            defaultTargetGroups: [
                new ApplicationTargetGroup(this, 'grafana-servers', {
                    vpc,
                    protocol: ApplicationProtocol.HTTP,
                    port: 3000,
                    targets: [
                        new InstanceIdTarget(ec2.instanceId)
                    ]
                })
            ]
        })

        new CfnOutput(this, 'url', { value: lb.loadBalancerDnsName })
        new CfnOutput(this, 'ssh', { value: `ssh://bitnami@${ec2.instancePrivateIp}` })

        if (process.env.GITHUB_TOKEN == null) throw new Error('Must define GITHUB_TOKEN')

        const lambda = new NodejsFunction(this, 'eng-standard', {
            entry: path.resolve(__dirname, '..', 'lambda.js'),
            // increase timeout to a realistic figure, noting we run in serial
            timeout: Duration.minutes(5),
            environment: {
                GITHUB_TOKEN: process.env.GITHUB_TOKEN as string,
                INPUT_TIMESTREAM_DB: db.ref,
                INPUT_TIMESTREAM_TABLE: tableName,
                INPUT_TIMESTREAM_REGION: this.region
            },
            bundling: {
                metafile: true,
                // set environment variables here that should not be changed
                define: {
                    'process.env.INPUT_PRODUCT_FILE': JSON.stringify('products.tsv'),
                    'process.env.INPUT_REPAIR': JSON.stringify(false)
                },
                commandHooks: {
                    beforeBundling: () => [],
                    beforeInstall: () => [],
                    afterBundling(inputDir: string, outputDir: string): string[] {
                        return [
                            `cp ${inputDir}/products.tsv ${outputDir}`,
                            `cp -R ${inputDir}/template/ ${outputDir}/template`,
                            // ensure the template is clean, needed in development
                            `find ${outputDir}/template -name node_modules -depth -exec rm -rf \\{\\} \\;`,
                            `find ${outputDir}/template -name build -depth -exec rm -rf \\{\\} \\;`,
                            `rm -rf ${outputDir}/template/.git`
                        ];
                    }
                }
              }
        })

        lambda.grantPrincipal.addToPrincipalPolicy(timestreamBasePolicy)
        lambda.grantPrincipal.addToPrincipalPolicy(timestreamWritePolicy)

        new Rule(this, 'eng-standard-schedule', {
          schedule: Schedule.rate(this.checkInterval),
          targets: [new LambdaFunction(lambda)]
        })
    }
}

const app = new App();
new MyStack(app, 'ShipEveryMerge', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT, 
        region: process.env.CDK_DEFAULT_REGION 
    }
});
app.synth();
