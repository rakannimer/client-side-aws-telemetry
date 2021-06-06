import React from "react";
import logo from "./logo.svg";
import "./App.css";
import AwsTelemetry from "client-side-telemetry-js";

const telemetryConfig = {
  identityPoolId: "us-east-1:bc36bea5-5b0f-486a-8812-c68c2a5e4842",
  userPoolWebClientId: "2sjihthbvodq1pos6m29mi6c2j",
  userPoolId: "us-east-1_z4PrZ5N3Z",
  region: "us-east-1",
  pinpointAppId: "d93d53bad9d14682a93d7de2499c56f0",
}

const logger = new AwsTelemetry(telemetryConfig);

function App() {
  React.useEffect(() => {
    logger.info(`Hello`);
    setTimeout(() => {
      logger.info(`Hello 2 seconds later`);
    }, 2200);
  }, []);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          <a
            className="App-link"
            rel="noopener noreferrer"
            target="_blank"
            href="https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups"
          >
            Check CloudWatch logs{" "}
          </a>
        </p>
        <a
          className="App-link"
          href="https://console.aws.amazon.com/pinpoint/home?region=us-east-1"
          target="_blank"
          rel="noopener noreferrer"
        >
          Check your Pinpoint application
        </a>
      </header>
    </div>
  );
}

export default App;
