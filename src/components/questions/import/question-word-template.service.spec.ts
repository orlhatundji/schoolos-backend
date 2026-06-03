import { DocxArchive } from './docx-archive';
import { QuestionWordTemplateService } from './question-word-template.service';

describe('QuestionWordTemplateService', () => {
  it('generates a non-empty docx template with all supported question type examples', () => {
    const buffer = new QuestionWordTemplateService().generateTemplate();
    const archive = DocxArchive.read(buffer);
    const documentXml = archive.get('word/document.xml')?.toString('utf8') ?? '';

    expect(buffer.length).toBeGreaterThan(0);
    expect(documentXml).toContain('MCQ_SINGLE');
    expect(documentXml).toContain('MCQ_MULTI');
    expect(documentXml).toContain('TRUE_FALSE');
    expect(documentXml).toContain('NUMERIC');
    expect(documentXml).toContain('SHORT_ANSWER');
    expect(documentXml).toContain('THEORY');
  });
});
