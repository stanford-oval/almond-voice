# Server for Speech-to-Text

Node.js server that uses the Microsoft CognitiveServices Speech SDK to do speech-to-text.

The following environment variables should be set:

```
export AZURE_KEY=<YOUR_AZURE_KEY>
export AZURE_REGION=<YOUR_AZURE_REGION>
export PORT=<PREFERRED_PORT> // Defaults to 4000
```

Run the following command to start the server:

```
yarn start
```
