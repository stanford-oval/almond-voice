const settings = {
  language: process.env.SPEECH_SDK_LANGUAGE as string,
  serviceRegion: process.env.SPEECH_SDK_SERVICE_REGION as string,
  subscriptionKey: process.env.SPEECH_SDK_SUBSCRIPTION_KEY as string,
};

export default settings;
