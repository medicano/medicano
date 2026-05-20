import { buildTriageSystemPrompt, TRIAGE_SYSTEM_PROMPT } from '../constants/triage-prompt';

describe('buildTriageSystemPrompt', () => {
  it('should include feminine pronoun instruction for SHE', () => {
    const prompt = buildTriageSystemPrompt({ name: 'Marina', pronouns: 'SHE' });
    expect(prompt).toContain('pronomes femininos');
    expect(prompt).toContain('Marina');
  });

  it('should include masculine pronoun instruction for HE', () => {
    const prompt = buildTriageSystemPrompt({ name: 'João', pronouns: 'HE' });
    expect(prompt).toContain('pronomes masculinos');
  });

  it('should include neutral pronoun instruction for THEY', () => {
    const prompt = buildTriageSystemPrompt({ name: 'Alex', pronouns: 'THEY' });
    expect(prompt).toContain('pronomes neutros');
    expect(prompt).toContain('construções neutras');
  });

  it('should not include pronoun instruction when pronouns is undefined', () => {
    const prompt = buildTriageSystemPrompt({ name: 'Test' });
    expect(prompt).not.toContain('IMPORTANTE: O paciente usa pronomes');
  });

  it('should not include pronoun instruction when patient is undefined', () => {
    const prompt = buildTriageSystemPrompt(undefined);
    expect(prompt).not.toContain('IMPORTANTE: O paciente usa pronomes');
  });

  it('TRIAGE_SYSTEM_PROMPT constant should equal buildTriageSystemPrompt() with no args', () => {
    expect(TRIAGE_SYSTEM_PROMPT).toBe(buildTriageSystemPrompt());
  });
});
