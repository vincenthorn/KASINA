import React from "react";
import Layout from "../components/Layout";
import Freestyle from "../components/Freestyle";

const FreestylePage: React.FC = () => {
  return (
    <Layout fullWidth={true}>
      <Freestyle />
    </Layout>
  );
};

export default FreestylePage;