import { Instance, InstanceType, MachineImage, Peer, Port, SecurityGroup, UserData, Vpc } from '@aws-cdk/aws-ec2'
import { ApplicationLoadBalancer, ApplicationProtocol, ApplicationTargetGroup } from '@aws-cdk/aws-elasticloadbalancingv2'
import { InstanceIdTarget } from '@aws-cdk/aws-elasticloadbalancingv2-targets'
import { PolicyStatement } from '@aws-cdk/aws-iam'
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs'
import { CfnDatabase, CfnTable } from '@aws-cdk/aws-timestream'
import { App, CfnOutput, Construct, Stack, StackProps } from '@aws-cdk/core'

const BITNAMI = '979382823631'

export class MyStack extends Stack {
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

        const vpc = Vpc.fromLookup(this, 'vpc', {
            vpcName: 'CN-Development'  
        })

        const ec2SecurityGroup = new SecurityGroup(this, 'grafana-ec2-sg', { vpc })
        ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22))
        ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(3000))

        const ec2Init = UserData.forLinux()
        ec2Init.addCommands(
            // enable public dashboards
            `echo -e '\n[auth.anonymous]\nenabled = true' >> /opt/bitnami/grafana/conf/grafana.ini`,
            // install timestream plugin
            `sudo grafana-cli --pluginsDir /bitnami/grafana/data/plugins plugins install grafana-timestream-datasource`
        )

        const ec2 = new Instance(this, 'grafana', {
            // instanceName: 'grafana',
            instanceType: new InstanceType('t3.small'),
            keyName: 'robert',
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

        ec2.grantPrincipal.addToPrincipalPolicy(new PolicyStatement({
            actions: [
                "timestream:DescribeEndpoints",
                "timestream:ListDatabases",
                "timestream:SelectValues"
            ],
            resources: ['*']
          }))

        ec2.grantPrincipal.addToPrincipalPolicy(new PolicyStatement({
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
        }))

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

        new NodejsFunction(this, 'eng-standard', {
            entry: ''
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
