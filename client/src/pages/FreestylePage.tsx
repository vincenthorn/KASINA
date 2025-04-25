import React from "react";
import Layout from "../components/Layout";
import TimerFreestyle from "../components/TimerFreestyle";

const FreestylePage: React.FC = () => {
  return (
    <Layout fullWidth={true}>
      <TimerFreestyle />
    </Layout>
  );
};

export default FreestylePage;