import React from "react";
import Layout from "../components/Layout";
import TimerKasinas from "../components/TimerKasinas";

const KasinasPage: React.FC = () => {
  return (
    <Layout fullWidth={true}>
      <TimerKasinas />
    </Layout>
  );
};

export default KasinasPage;