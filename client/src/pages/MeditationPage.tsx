import React from "react";
import Layout from "../components/Layout";
import MeditationVideos from "../components/MeditationVideos";

const MeditationPage: React.FC = () => {
  return (
    <Layout>
      <MeditationVideos />
    </Layout>
  );
};

export default MeditationPage;