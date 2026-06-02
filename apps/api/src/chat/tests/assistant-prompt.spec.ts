import { buildAssistantSystemPrompt, ASSISTANT_SYSTEM_PROMPT } from '../constants/assistant-prompt';

describe('buildAssistantSystemPrompt', () => {
  it('should include feminine pronoun instruction for SHE', () => {
    const prompt = buildAssistantSystemPrompt({ name: 'Marina', pronouns: 'SHE' });
    expect(prompt).toContain('pronomes femininos');
    expect(prompt).toContain('Marina');
  });

  it('should include masculine pronoun instruction for HE', () => {
    const prompt = buildAssistantSystemPrompt({ name: 'João', pronouns: 'HE' });
    expect(prompt).toContain('pronomes masculinos');
  });

  it('should include neutral pronoun instruction for THEY', () => {
    const prompt = buildAssistantSystemPrompt({ name: 'Alex', pronouns: 'THEY' });
    expect(prompt).toContain('pronomes neutros');
    expect(prompt).toContain('construções neutras');
  });

  it('should not include pronoun instruction when pronouns is undefined', () => {
    const prompt = buildAssistantSystemPrompt({ name: 'Test' });
    expect(prompt).not.toContain('IMPORTANTE: O paciente usa pronomes');
  });

  it('should not include pronoun instruction when patient is undefined', () => {
    const prompt = buildAssistantSystemPrompt(undefined);
    expect(prompt).not.toContain('IMPORTANTE: O paciente usa pronomes');
  });

  it('should inject age, biological sex and gender into the clinical context', () => {
    const prompt = buildAssistantSystemPrompt({
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
    const prompt = buildAssistantSystemPrompt({ name: 'Test' });
    expect(prompt).not.toContain('Dados do paciente para orientar o assistente');
  });

  it('ASSISTANT_SYSTEM_PROMPT constant should equal buildAssistantSystemPrompt() with no args', () => {
    expect(ASSISTANT_SYSTEM_PROMPT).toBe(buildAssistantSystemPrompt());
  });
});
