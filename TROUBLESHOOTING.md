# Troubleshooting Guide

## Issues Fixed

### 1. AudioContext Error ✅

**Error**: `InvalidStateError: Cannot close a closed AudioContext`

**Fix**: Added state check before closing AudioContext to prevent closing an already-closed context.

### 2. Agent Not Responding 🔍

**Symptoms**:

- Agent is detected in room
- Agent doesn't generate initial greeting
- Agent doesn't respond to user speech

**Possible Causes**:

1. **Transcription not enabled**: The agent needs transcription to be enabled in the room
2. **Agent not receiving user audio**: Check if user microphone is working
3. **Agent backend issue**: The Python agent might not be processing transcriptions correctly

**Debugging Steps**:

1. Check browser console for transcription logs (should see `📝 👤 User` messages when you speak)
2. Check agent server logs for errors
3. Verify microphone permissions are granted
4. Check if agent is receiving transcriptions (check agent logs)

**What to Check**:

- Browser console should show transcription events when you speak
- Agent server logs should show it's receiving transcriptions
- Agent should generate greeting after joining (check agent code: `generate_reply` with greeting instructions)

### 3. Initial Greeting Not Working 🔍

**Symptoms**: Agent joins but doesn't say the initial greeting

**Possible Causes**:

1. Agent's `generate_reply` with greeting instructions not being called
2. Agent waiting for user to speak first
3. Agent backend issue with greeting generation

**Check Agent Code**:
The agent should call `session.generate_reply(instructions=coach.greeting_instructions)` after starting the session. Verify this is happening in the agent logs.

## Debugging Checklist

### Frontend (Web App)

- [ ] Check browser console for connection logs
- [ ] Verify transcription events are being received (`📝` logs)
- [ ] Check microphone permissions
- [ ] Verify agent is detected (`🤖 Agent detected` log)
- [ ] Check for any error messages

### Backend (Agent Server)

- [ ] Check agent server logs for connection
- [ ] Verify agent is joining the room
- [ ] Check if agent is receiving transcriptions
- [ ] Verify greeting generation is being called
- [ ] Check for any errors in agent processing

### LiveKit

- [ ] Verify room name format: `interview-{session_id}`
- [ ] Check LiveKit server logs
- [ ] Verify transcription is enabled in room settings

## Common Issues

### Agent Detected But Not Speaking

- **Cause**: Agent might be waiting for user input
- **Solution**: Try speaking first, or check agent code for automatic greeting

### No Transcription Events

- **Cause**: Transcription not enabled or microphone not working
- **Solution**:
  1. Grant microphone permissions
  2. Check browser console for errors
  3. Verify LiveKit transcription is enabled

### Agent Not Joining

- **Cause**: Agent server not running or room name mismatch
- **Solution**:
  1. Check agent server is running
  2. Verify room name format matches: `interview-{session_id}`
  3. Check agent server logs for connection errors

## Next Steps

1. **Test with console open**: Watch for transcription events when speaking
2. **Check agent logs**: Verify agent is receiving and processing transcriptions
3. **Verify microphone**: Test microphone in browser settings
4. **Check agent code**: Ensure greeting generation is implemented correctly
