import React, { createContext, useState } from "react";

export const SpeechContext = createContext();

export const SpeechProvider = ({ children }) => {
  const [speechText, setSpeechText] = useState("");

  return (
    <SpeechContext.Provider value={{ speechText, setSpeechText }}>
      {children}
    </SpeechContext.Provider>
  );
};
