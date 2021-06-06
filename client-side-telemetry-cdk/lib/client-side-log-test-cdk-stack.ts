import * as cdk from '@aws-cdk/core';
import * as cognito from "@aws-cdk/aws-cognito";
import { createCognitoIamRoles } from './cognito-auth-roles';
import * as pinpoint from '@aws-cdk/aws-pinpoint';

const { CfnOutput } = cdk

export class ClientSideLogTestCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const userPool = new cognito.UserPool(this, "user-pool", {});
    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      generateSecret: false, // Don't need to generate secret for web app running on browsers
    });
    const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      allowUnauthenticatedIdentities: true, // Allow unathenticated users
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });
    const pinpointApp = new pinpoint.CfnApp(this, "PinpointApp", {
      name: `pinpoint-${identityPool.ref}`
    });
    
    createCognitoIamRoles(this, identityPool.ref);

    // Export values
    new CfnOutput(this, "PinPointAppId", {
      value: pinpointApp.ref
    });
    new CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
    });
    new CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
    new CfnOutput(this, "IdentityPoolId", {
      value: identityPool.ref,
    });
    // The code that defines your stack goes here
  }
}

// const createA