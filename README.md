# Almond Voice

Voice interface for Almond, an open-source virtual assistant developed at Stanford University by the [Open Virtual Assistant Lab](https://oval.cs.stanford.edu/).

## API

Currently, Almond Voice provides two REST endpoints used for Almond-based services, both hosted at [voice.almond.stanford.edu](https://voice.almond.stanford.edu). Support for websocket-based streaming will be added in the future.

### Speech-to-text

#### Request

```
POST /rest/stt
Host: voice.almond.stanford.edu
Content-Type: multipart/form-data
```

Where the body of the request contains a `.wav` file.

#### Response

```
{
    success: true,
    text: 'Recognized text.'
}
```

### Text-to-speech

#### Request

```
POST /rest/tts
Host: voice.almond.stanford.edu
```

Parameters:
```
{
    text: 'Text to convert to speech.'
}
```

#### Response

```
{
    success: true,
    audio: '/audio/<arbitrary_speech_filename>.wav'
}
```
