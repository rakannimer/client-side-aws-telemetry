import { AuthClass } from "@aws-amplify/auth/lib-esm/Auth";
import { AnalyticsClass } from "@aws-amplify/analytics/lib-esm/Analytics";
import {
  CreateLogStreamCommand,
  PutLogEventsCommand,
  CloudWatchLogsClient,
} from "@aws-sdk/client-cloudwatch-logs";

const getCompactCredentials = (credentials /*: Credentials*/) => {
  return {
    accessKeyId: credentials.accessKeyId,
    sessionToken: credentials.sessionToken,
    secretAccessKey: credentials.secretAccessKey,
    identityId: credentials.identityId,
    authenticated: credentials.authenticated,
  };
};

const LOG_LEVEL = {
  INFO: 0,
  WARN: 1,
  ERROR: 2,
};

const LOGGER_LEVEL_STRING_MAPPING = {
  0: "INFO",
  1: "WARN",
  2: "ERROR",
};

const MINIMUM_LEVEL_TO_SEND_TO_CLOUDWATCH = LOG_LEVEL.INFO;

// interface TelemetryOptions = {
//  userPoolId: string;
//  userPoolWebClientId: string;
//  identityPoolId: string;
//  region: string;
//  pinpointAppId: string
// }
export default class Telemetry {
  constructor(telemetryOptions /*: TelemetryOptions*/ = {}) {
    const { pinpointAppId, region} = telemetryOptions;
    this.Auth = new AuthClass(telemetryOptions);
    this.Analytics = new AnalyticsClass();
    this.Analytics.configure({
      ...telemetryOptions,
      AWSPinpoint: {
        appId: pinpointAppId,
        region: region,
      },
    });
    this.isLoadingCloudWatch = false;
    this.minimumLevel = MINIMUM_LEVEL_TO_SEND_TO_CLOUDWATCH;
    this.backlog = [
      // LOG_LEVEL.INFO,
      [],
      // LOG_LEVEL.WARN
      [],
      // LOG_LEVEL.ERROR
      [],
    ];
    this.logGroupName = "client-side-test";
    this.logStreamName = "log-stream-name-" + Date.now();
    this.loggerKey = `logger:${this.logGroupName}:${this.logStreamName}`;
    this.intervalInMs = 1000;
    this.cloudWatchLogsClient = null;
    this.initializeCloudWatch(region).then(() => {
      this.Analytics.record({ name: 'albumVisit' });
      this.startTimer();
    });
  }
  initializeCloudWatch(region) {
    this.isLoadingCloudWatch = true;
    return this.Auth.currentUserCredentials()
      .then((credentials) => {
        console.log("GOT CREDENTIALS ", credentials);
        return new CloudWatchLogsClient({
          region,
          credentials: getCompactCredentials(credentials),
        });
      })
      .then((client) => {
        this.cloudWatchLogsClient = client;
      })
      .then(() => this.createLogStream())
      .then(() => {
        this.isLoadingCloudWatch = false;
      });
  }
  startTimer() {
    this.intervalId = setInterval(() => {
      for (let i = this.minimumLevel; i < this.backlog.length; i += 1) {
        if (this.backlog[i].length === 0) return;
        const logEvents = [...this.backlog[i]];
        this.backlog[i] = [];
        this.putLogEvents(this.logGroupName, this.logStreamName, logEvents);
      }
    }, this.intervalInMs);
  }

  formatMessage(message = "", level = 0) {
    return `[${
      LOGGER_LEVEL_STRING_MAPPING[level]
    }]::${new Date().toLocaleString()}::${message}`;
  }

  info(rawMessage = "") {
    const level = LOG_LEVEL.INFO;
    const message = this.formatMessage(rawMessage, level);
    this.backlog[LOG_LEVEL.INFO].push({ message, timestamp: Date.now() });
  }
  warn(rawMessage = "") {
    const level = LOG_LEVEL.WARN;
    const message = this.formatMessage(rawMessage, level);
    this.backlog[LOG_LEVEL.WARN].push({ message, timestamp: Date.now() });
  }
  error(rawMessage = "") {
    const level = LOG_LEVEL.ERROR;
    const message = this.formatMessage(rawMessage, level);
    this.backlog[LOG_LEVEL.ERROR].push({ message, timestamp: Date.now() });
  }

  putLogEvents(
    logGroupName /*: string*/,
    logStreamName /*: string*/,
    logEvents /*: InputLogEvent[]*/ = [],
    retry = 1
  ) {
    const command = new PutLogEventsCommand({
      logGroupName,
      logStreamName,
      logEvents,
      sequenceToken: localStorage.getItem(this.loggerKey),
    });
    console.log("Sending putLogEvents", logEvents);
    return this.cloudWatchLogsClient
      .send(command)
      .then((response) => {
        console.log("Sent putLogEvents", logEvents);
        localStorage.setItem(this.loggerKey, response.nextSequenceToken);
        return response;
      })
      .catch((error) => {
        if (error.name === "InvalidSequenceTokenException" && retry < 3) {
          console.warn(
            "InvalidSequenceTokenException, attempting to resolve with ",
            error.expectedSequenceToken
          );
          localStorage.setItem(this.loggerKey, error.expectedSequenceToken);
          return this.putLogEvents(
            logGroupName,
            logStreamName,
            logEvents,
            retry + 1
          );
        }
        console.error(error);
        throw error;
      });
  }

  createLogStream() {
    const command = new CreateLogStreamCommand({
      logGroupName: this.logGroupName,
      logStreamName: this.logStreamName,
    });
    return this.cloudWatchLogsClient.send(command);
  }
}
