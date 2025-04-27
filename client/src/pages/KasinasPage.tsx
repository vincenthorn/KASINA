import React, { useState } from "react";
import Layout from "../components/Layout";
import TimerKasinas from "../components/TimerKasinas";
import TimerKasinasSimplified from "../components/TimerKasinasSimplified";

const KasinasPage: React.FC = () => {
  // Use the simplified version for now
  const [useSimplifiedVersion] = useState(true);
  
  return (
    <Layout fullWidth={true}>
      {useSimplifiedVersion ? (
        <TimerKasinasSimplified />
      ) : (
        <TimerKasinas />
      )}
    </Layout>
  );
};

export default KasinasPage;