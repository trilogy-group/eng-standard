import { Instance, InstanceType, MachineImage, Peer, Port, SecurityGroup, Subnet, UserData, Vpc } from '@aws-cdk/aws-ec2'
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup } from '@aws-cdk/aws-elasticloadbalancingv2'
import { InstanceIdTarget } from '@aws-cdk/aws-elasticloadbalancingv2-targets'
import { Rule, Schedule } from '@aws-cdk/aws-events'
import { LambdaFunction } from '@aws-cdk/aws-events-targets'
import { ManagedPolicy, PolicyStatement } from '@aws-cdk/aws-iam'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'
import { Secret } from '@aws-cdk/aws-secretsmanager'
import { CfnDatabase, CfnTable } from '@aws-cdk/aws-timestream'
import { App, CfnOutput, Construct, Duration, Fn, Stack, StackProps } from '@aws-cdk/core'
import * as path from 'path'

const BITNAMI = '979382823631'
const vpcName = 'CN-Development'
const availabilityZone = 'us-east-1c'
const subnetId = 'subnet-0e251e1c64ffec456' // CNA-Development-Public
// load balancer requires two AZs
const secondaryAvailabilityZone = 'us-east-1d'
const secondarySubnetId = 'subnet-027165e52297871a7' // CNB-Development-Public

export class MyStack extends Stack {
    private readonly checkInterval = Duration.minutes(15)

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props)

        const db = new CfnDatabase(this, 'ShipEveryMerge')

        const table = new CfnTable(this, 'Compliance', {
            databaseName: db.ref,
            retentionProperties: {
                MemoryStoreRetentionPeriodInHours: '24',
                MagneticStoreRetentionPeriodInDays: '365'
            }
        })

        const metricsTable = new CfnTable(this, 'Metrics', {
            databaseName: db.ref,
            retentionProperties: {
                MemoryStoreRetentionPeriodInHours: '744', // 1 month
                MagneticStoreRetentionPeriodInDays: '3650' // 10 years
            }
        })

        const uptimeTable = new CfnTable(this, 'Uptime', {
            databaseName: db.ref,
            retentionProperties: {
                MemoryStoreRetentionPeriodInHours: '8766', // 1 year
                MagneticStoreRetentionPeriodInDays: '3650' // 10 years
            }
        })

        const secretEngHub = Secret.fromSecretNameV2(this, 'secret-enghub', 'eng-standard/enghub')
        const secretUptimeDb = Secret.fromSecretNameV2(this, 'secret-uptime-db', 'eng-standard/uptime-db')

        const tableName = this.timestreamTableName(table)
        const metricsTableName = this.timestreamTableName(metricsTable)
        const uptimeTableName = this.timestreamTableName(uptimeTable)

        const vpc = Vpc.fromLookup(this, 'vpc', { vpcName })
        const subnet = Subnet.fromSubnetAttributes(this, 'subnet', {
            subnetId,
            availabilityZone
        })
        const secondarySubnet = Subnet.fromSubnetAttributes(this, 'secondarySubnet', {
            subnetId: secondarySubnetId,
            availabilityZone: secondaryAvailabilityZone
        })

        const ec2SecurityGroup = new SecurityGroup(this, 'grafana-ec2-sg', { vpc })
        ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22))
        ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(3000))

        const complianceDataSource = this.dataSourceConfig('Compliance', db, tableName)
        const metricsDataSource = this.dataSourceConfig('Metrics', db, metricsTableName)
        const uptimeDataSource = this.dataSourceConfig('Uptime', db, uptimeTableName)

        const ec2Init = UserData.forLinux()
        ec2Init.addCommands(
            // enable public dashboards
            'echo -e "\n[auth.anonymous]\nenabled = true" >> /opt/bitnami/grafana/conf/grafana.ini',
            // install plugins
            'sudo grafana-cli --pluginsDir /bitnami/grafana/data/plugins plugins install grafana-timestream-datasource',
            'sudo grafana-cli --pluginsDir /bitnami/grafana/data/plugins plugins install marcusolsson-json-datasource',
            // enable data sources
            `echo -e '${complianceDataSource}' > /bitnami/grafana/conf/provisioning/datasources/compliance.yaml`,
            `echo -e '${metricsDataSource}' > /bitnami/grafana/conf/provisioning/datasources/metrics.yaml`,
            `echo -e '${uptimeDataSource}' > /bitnami/grafana/conf/provisioning/datasources/uptime.yaml`,
            // apply changes by restarting grafana
            'sudo /opt/bitnami/ctlscript.sh restart grafana'
        )

        const ec2 = new Instance(this, 'grafana-ec2', {
            // instanceName: 'grafana',
            instanceType: new InstanceType('t3.small'),
            keyName: 'sem-grafana',
            vpc,
            availabilityZone,
            vpcSubnets: { subnets: [ subnet ] },
            sourceDestCheck: true,
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
                table.attrArn,
                metricsTable.attrArn,
                uptimeTable.attrArn
            ]
        })

        const timestreamWritePolicy = new PolicyStatement({
            actions: [ "timestream:*" ],
            resources: [
                db.attrArn,
                table.attrArn,
                metricsTable.attrArn,
                uptimeTable.attrArn
            ]
        })

        const cloudWatchAcrossAccountPolicy = new PolicyStatement({
            actions: [ 'sts:AssumeRole' ],
            resources: [ 'arn:aws:iam::*:role/CloudWatch-CrossAccountSharingRole' ]
        })

        ec2.grantPrincipal.addToPrincipalPolicy(timestreamBasePolicy)
        ec2.grantPrincipal.addToPrincipalPolicy(timestreamReadPolicy)
        ec2.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'))
        ec2.role.addToPrincipalPolicy(cloudWatchAcrossAccountPolicy)

        const lbSecurityGroup = new SecurityGroup(this, 'grafana-lb-sg', { vpc })
        lbSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80))

        const lb = new ApplicationLoadBalancer(this, 'grafana', {
            // loadBalancerName: 'grafana',
            vpc,
            vpcSubnets: { subnets: [ subnet, secondarySubnet ] },
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
                TIMESTREAM_DB: db.ref,
                TIMESTREAM_TABLE: tableName,
                TIMESTREAM_METRICS_TABLE: metricsTableName,
                TIMESTREAM_REGION: this.region
            },
            bundling: {
                metafile: true,
                // set environment variables here that should not be changed
                define: {
                    'process.env.INPUT_REPAIR': JSON.stringify(false)
                }
              }
        })

        lambda.grantPrincipal.addToPrincipalPolicy(timestreamBasePolicy)
        lambda.grantPrincipal.addToPrincipalPolicy(timestreamWritePolicy)
        secretEngHub.grantRead(lambda.grantPrincipal)

        new Rule(this, 'eng-standard-schedule', {
          schedule: Schedule.rate(this.checkInterval),
          targets: [new LambdaFunction(lambda)]
        })

        const cloneUptimeLambda = new NodejsFunction(this, 'clone-uptime', {
            entry: path.resolve(__dirname, 'uptime', 'uptime-from-jira.lambda.js'),
            timeout: Duration.minutes(5),
            environment: {
                TIMESTREAM_DB: db.ref,
                TIMESTREAM_UPTIME_TABLE: uptimeTableName,
                TIMESTREAM_REGION: this.region
            }
        })
        cloneUptimeLambda.grantPrincipal.addToPrincipalPolicy(timestreamBasePolicy)
        cloneUptimeLambda.grantPrincipal.addToPrincipalPolicy(timestreamWritePolicy)
        secretEngHub.grantRead(cloneUptimeLambda.grantPrincipal)
        secretUptimeDb.grantRead(cloneUptimeLambda.grantPrincipal)

        new Rule(this, 'clone-uptime-schedule', {
            schedule: Schedule.rate(Duration.minutes(5)),
            targets: [new LambdaFunction(cloneUptimeLambda)]
        })
    }

    private dataSourceConfig(dataSourceName: string, db: CfnDatabase, tableName: string) {
        return `
apiVersion: 1
datasources:
- name: ${dataSourceName}
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
    }

    private timestreamTableName(table: CfnTable) {
        return Fn.select(1, Fn.split('|', table.ref, 2))
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
