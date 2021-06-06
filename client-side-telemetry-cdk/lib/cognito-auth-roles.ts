import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as cognito from "@aws-cdk/aws-cognito";

const cloudwatchPermissionPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ["logs:PutLogEvents", "logs:CreateLogStream"],
  resources: ["arn:aws:logs:*:*:log-group:*:log-stream:*"],
});

const pinpointPutEventsPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ["mobiletargeting:PutEvents", "mobiletargeting:UpdateEndpoint"],
  resources: ["arn:aws:mobiletargeting:*:*:apps/*"],
});

const getRole = (identityPoolRef: string, authed: boolean) => ({
  assumedBy: new iam.FederatedPrincipal(
    "cognito-identity.amazonaws.com",
    {
      StringEquals: {
        "cognito-identity.amazonaws.com:aud": identityPoolRef,
      },
      "ForAnyValue:StringLike": {
        "cognito-identity.amazonaws.com:amr": authed ? "authenticated" : "unauthenticated",
      },
    },
    "sts:AssumeRoleWithWebIdentity"
  ),
});

export const createCognitoIamRoles = (
  scope: cdk.Construct,
  identityPoolRef: string
) => {
  const authedRole = new iam.Role(scope, "CognitoAuthenticatedRole", getRole(identityPoolRef, true));
  const unAuthedRole = new iam.Role(scope, "CognitoUnAuthenticatedRole", getRole(identityPoolRef, false));
  authedRole.addToPolicy(cloudwatchPermissionPolicy);
  authedRole.addToPolicy(pinpointPutEventsPolicy);

  unAuthedRole.addToPolicy(cloudwatchPermissionPolicy);
  unAuthedRole.addToPolicy(pinpointPutEventsPolicy);

  new cognito.CfnIdentityPoolRoleAttachment(
    scope,
    "IdentityPoolRoleAttachment",
    {
      identityPoolId: identityPoolRef,
      roles: {
        authenticated: authedRole.roleArn,
        unauthenticated: unAuthedRole.roleArn,
      },
    }
  );
};