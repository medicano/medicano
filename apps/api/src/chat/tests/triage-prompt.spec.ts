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

  it('should inject age, biological sex and gender into the clinical context', () => {
    const prompt = buildTriageSystemPrompt({
      name: 'Marina',
      age: 34,
      sex: 'FEMALE',
      gender: 'OTHER',
    });
    expect(prompt).toContain('idade 34 anos');
    expect(prompt).toContain('sexo biológico feminino');
    expect(prompt).toContain('gênero outro');
  });

  it('should omit the clinical context when no clinical data is provided', () => {
    const prompt = buildTriageSystemPrompt({ name: 'Test' });
    expect(prompt).not.toContain('Dados do paciente para orientar a triagem');
  });

  it('TRIAGE_SYSTEM_PROMPT constant should equal buildTriageSystemPrompt() with no args', () => {
    expect(TRIAGE_SYSTEM_PROMPT).toBe(buildTriageSystemPrompt());
  });
});
