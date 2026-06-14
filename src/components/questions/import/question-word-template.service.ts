import { Injectable } from '@nestjs/common';

import { DocxArchive } from './docx-archive';

const TEMPLATE_PARAGRAPHS = [
  'Schos Question Upload Template',
  '',
  'Instructions:',
  '1. Keep each question in the Q<number>. format shown below.',
  '2. Use Answer: as the only official answer marker.',
  '3. Supported Type values: MCQ_SINGLE, MCQ_MULTI, TRUE_FALSE, NUMERIC, SHORT_ANSWER, THEORY.',
  '4. Supported Difficulty values: EASY, MEDIUM, HARD.',
  '5. For equations, use Word equation editor or type LaTeX inside $...$ delimiters.',
  '6. Images are not supported in the first version of the Word importer.',
  '',
  'Q1. What is 2 + 2?',
  'Type: MCQ_SINGLE',
  'A. 3',
  'B. 4',
  'C. 5',
  'D. 6',
  'Answer: B',
  'Explanation: 2 + 2 equals 4.',
  'Difficulty: EASY',
  'Weight: 1',
  '',
  'Q2. Select all prime numbers.',
  'Type: MCQ_MULTI',
  'A. 2',
  'B. 3',
  'C. 4',
  'D. 6',
  'Answer: A, B',
  'Explanation: 2 and 3 are prime.',
  'Difficulty: MEDIUM',
  'Weight: 2',
  '',
  'Q3. The earth revolves around the sun.',
  'Type: TRUE_FALSE',
  'Answer: True',
  'Explanation: Earth orbits the sun once each year.',
  'Difficulty: EASY',
  'Weight: 1',
  '',
  'Q4. Calculate the value of 12.5 x 4.',
  'Type: NUMERIC',
  'Answer: 50',
  'Tolerance: 0',
  'Tolerance Mode: ABSOLUTE',
  'Explanation: 12.5 multiplied by 4 equals 50.',
  'Difficulty: MEDIUM',
  'Weight: 1',
  '',
  'Q5. What gas do plants absorb during photosynthesis?',
  'Type: SHORT_ANSWER',
  'Answer: carbon dioxide; CO2; carbon dioxide gas',
  'Case Sensitive: false',
  'Normalize Whitespace: true',
  'Explanation: Plants absorb carbon dioxide during photosynthesis.',
  'Difficulty: EASY',
  'Weight: 1',
  '',
  'Q6. Explain how photosynthesis supports life on earth.',
  'Type: THEORY',
  'Answer: Photosynthesis converts light energy into chemical energy, producing glucose for plants and oxygen used by many living organisms.',
  'Explanation: Award marks for mentioning light energy, glucose or food production, and oxygen release.',
  'Difficulty: HARD',
  'Weight: 5',
  '',
  'Q7. Solve the equation $x^2 + 3x + 2 = 0$.',
  'Type: SHORT_ANSWER',
  'Answer: x = -1; x = -2; -1 and -2',
  'Explanation: Factor x^2 + 3x + 2 as (x + 1)(x + 2).',
  'Difficulty: MEDIUM',
  'Weight: 2',
];

@Injectable()
export class QuestionWordTemplateService {
  generateTemplate(): Buffer {
    return DocxArchive.create([
      { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml()) },
      { name: '_rels/.rels', data: Buffer.from(rootRelationshipsXml()) },
      { name: 'word/_rels/document.xml.rels', data: Buffer.from(documentRelationshipsXml()) },
      { name: 'word/document.xml', data: Buffer.from(documentXml(TEMPLATE_PARAGRAPHS)) },
      { name: 'word/styles.xml', data: Buffer.from(stylesXml()) },
      { name: 'docProps/core.xml', data: Buffer.from(corePropsXml()) },
      { name: 'docProps/app.xml', data: Buffer.from(appPropsXml()) },
    ]);
  }
}

function documentXml(paragraphs: string[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.map((paragraph) => paragraphXml(paragraph)).join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function paragraphXml(text: string) {
  if (text.length === 0) return '<w:p/>';
  return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function rootRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function documentRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>`;
}

function corePropsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Schos Question Upload Template</dc:title>
  <dc:creator>Schos</dc:creator>
  <cp:lastModifiedBy>Schos</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-01-01T00:00:00Z</dcterms:modified>
</cp:coreProperties>`;
}

function appPropsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Schos</Application>
</Properties>`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
