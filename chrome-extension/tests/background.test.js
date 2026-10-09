import { describe, expect, it } from 'vitest';
import { MESSAGE_TYPES } from '../src/shared/messageTypes.js';

describe('Chrome Extension Background message contract', () => {
  it('keeps the core background message names stable', () => {
    expect(MESSAGE_TYPES.BRSE_AI_REQUEST).toBe('BRSE_AI_REQUEST');
    expect(MESSAGE_TYPES.BRSE_AI_STREAM_CHUNK).toBe('BRSE_AI_STREAM_CHUNK');
    expect(MESSAGE_TYPES.BRSE_GET_GLOSSARY).toBe('BRSE_GET_GLOSSARY');
    expect(MESSAGE_TYPES.BRSE_ADD_GLOSSARY_TERM).toBe('BRSE_ADD_GLOSSARY_TERM');
    expect(MESSAGE_TYPES.BRSE_SET_MODEL).toBe('BRSE_SET_MODEL');
  });
});
