/**
 * Smart Document Classification Service
 * Uses pattern recognition and AI to automatically classify construction documents
 */

export type DocumentCategory =
  | 'contract'
  | 'invoice'
  | 'receipt'
  | 'change_order'
  | 'blueprint'
  | 'permit'
  | 'inspection_report'
  | 'daily_report'
  | 'timesheet'
  | 'rfq'
  | 'proposal'
  | 'correspondence'
  | 'photo'
  | 'safety_document'
  | 'warranty'
  | 'other';

export interface ClassificationResult {
  category: DocumentCategory;
  confidence: number; // 0-1
  subcategory?: string;
  extractedData: Record<string, any>;
  suggestions: string[];
  metadata: {
    detectedFields: string[];
    language?: string;
    pageCount?: number;
    hasSignature?: boolean;
    hasLogo?: boolean;
  };
}

export interface DocumentFeatures {
  filename: string;
  content?: string; // OCR text
  fileType: string;
  keywords: string[];
  patterns: string[];
  metadata?: any;
}

/**
 * Document Classification Service
 */
export class DocumentClassifierService {
  // Keyword patterns for each document type
  private readonly categoryPatterns: Record<DocumentCategory, string[]> = {
    contract: [
      'agreement',
      'contractor',
      'terms and conditions',
      'parties agree',
      'scope of work',
      'contract price',
      'payment terms',
      'completion date',
      'liquidated damages',
    ],
    invoice: [
      'invoice',
      'bill to',
      'invoice number',
      'invoice date',
      'amount due',
      'total amount',
      'payment due',
      'remit payment',
      'line item',
    ],
    receipt: [
      'receipt',
      'paid',
      'transaction',
      'payment received',
      'thank you for your payment',
      'purchase date',
      'total paid',
    ],
    change_order: [
      'change order',
      'change request',
      'modification',
      'scope change',
      'additional work',
      'cost adjustment',
      'time extension',
      'change order number',
    ],
    blueprint: [
      'drawing',
      'blueprint',
      'architectural',
      'floor plan',
      'elevation',
      'section',
      'detail',
      'scale',
      'drawing number',
      'revision',
    ],
    permit: [
      'permit',
      'building permit',
      'permit number',
      'permit application',
      'approval',
      'inspection',
      'code compliance',
      'zoning',
    ],
    inspection_report: [
      'inspection',
      'inspection report',
      'passed',
      'failed',
      'inspector',
      'compliance',
      'deficiency',
      'corrective action',
    ],
    daily_report: [
      'daily report',
      'field report',
      'progress report',
      'weather',
      'crew',
      'equipment',
      'work performed',
      'activities',
    ],
    timesheet: [
      'timesheet',
      'time card',
      'hours worked',
      'overtime',
      'labor hours',
      'employee',
      'clock in',
      'clock out',
    ],
    rfq: [
      'request for quote',
      'rfq',
      'quotation',
      'bid request',
      'scope of work',
      'bid due date',
      'specifications',
    ],
    proposal: [
      'proposal',
      'bid',
      'quotation',
      'estimate',
      'scope of services',
      'pricing',
      'deliverables',
      'project timeline',
    ],
    correspondence: [
      'email',
      'letter',
      'memo',
      'memorandum',
      'regarding',
      'dear',
      'sincerely',
      'correspondence',
    ],
    photo: [
      'photo',
      'image',
      'picture',
      'site photo',
      'progress photo',
      'before',
      'after',
      'construction photo',
    ],
    safety_document: [
      'safety',
      'osha',
      'accident report',
      'incident',
      'safety plan',
      'hazard',
      'ppe',
      'safety meeting',
    ],
    warranty: [
      'warranty',
      'guarantee',
      'coverage',
      'warranty period',
      'defect',
      'warranty claim',
    ],
    other: [],
  };

  // Filename patterns
  private readonly filenamePatterns: Record<string, DocumentCategory> = {
    'invoice': 'invoice',
    'receipt': 'receipt',
    'contract': 'contract',
    'co_': 'change_order',
    'change': 'change_order',
    'blueprint': 'blueprint',
    'drawing': 'blueprint',
    'permit': 'permit',
    'inspection': 'inspection_report',
    'daily': 'daily_report',
    'timesheet': 'timesheet',
    'rfq': 'rfq',
    'proposal': 'proposal',
    'safety': 'safety_document',
  };

  /**
   * Classify a document
   */
  async classifyDocument(features: DocumentFeatures): Promise<ClassificationResult> {
    // Extract features
    const extractedFeatures = this.extractFeatures(features);

    // Calculate scores for each category
    const scores = this.calculateCategoryScores(extractedFeatures);

    // Get best match
    const bestMatch = this.getBestMatch(scores);

    // Extract data based on category
    const extractedData = this.extractCategoryData(bestMatch.category, features.content || '');

    // Generate suggestions
    const suggestions = this.generateSuggestions(bestMatch.category, extractedData);

    // Detect metadata
    const metadata = this.detectMetadata(features);

    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      subcategory: extractedData.subcategory,
      extractedData,
      suggestions,
      metadata,
    };
  }

  /**
   * Extract features from document
   */
  private extractFeatures(features: DocumentFeatures): {
    filenameTokens: string[];
    contentTokens: string[];
    fileType: string;
  } {
    // Tokenize filename
    const filenameTokens = features.filename
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);

    // Tokenize content
    const contentTokens = (features.content || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(token => token.length > 2);

    return {
      filenameTokens,
      contentTokens,
      fileType: features.fileType,
    };
  }

  /**
   * Calculate scores for each category
   */
  private calculateCategoryScores(features: {
    filenameTokens: string[];
    contentTokens: string[];
    fileType: string;
  }): Record<DocumentCategory, number> {
    const scores: Record<DocumentCategory, number> = {} as any;

    // Check filename patterns first (higher weight)
    let filenameMatch: DocumentCategory | null = null;
    for (const [pattern, category] of Object.entries(this.filenamePatterns)) {
      if (features.filenameTokens.some(token => token.includes(pattern))) {
        filenameMatch = category;
        break;
      }
    }

    // Calculate content-based scores
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      let score = 0;

      // Filename match bonus
      if (filenameMatch === category) {
        score += 30;
      }

      // Count pattern matches in content
      for (const pattern of patterns) {
        const patternTokens = pattern.toLowerCase().split(/\s+/);

        // Check if all tokens in pattern exist in content
        const allTokensFound = patternTokens.every(token =>
          features.contentTokens.some(contentToken => contentToken.includes(token))
        );

        if (allTokensFound) {
          score += 10; // Full pattern match
        } else {
          // Partial match
          const matchingTokens = patternTokens.filter(token =>
            features.contentTokens.some(contentToken => contentToken.includes(token))
          );
          score += matchingTokens.length * 2;
        }
      }

      scores[category as DocumentCategory] = score;
    }

    // File type specific bonuses
    if (features.fileType === 'image') {
      scores.photo = (scores.photo || 0) + 20;
      scores.blueprint = (scores.blueprint || 0) + 10;
    } else if (features.fileType === 'pdf') {
      scores.contract = (scores.contract || 0) + 5;
      scores.blueprint = (scores.blueprint || 0) + 5;
    }

    return scores;
  }

  /**
   * Get best matching category
   */
  private getBestMatch(scores: Record<DocumentCategory, number>): {
    category: DocumentCategory;
    confidence: number;
  } {
    // Find category with highest score
    let bestCategory: DocumentCategory = 'other';
    let bestScore = 0;
    let totalScore = 0;

    for (const [category, score] of Object.entries(scores)) {
      totalScore += score;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category as DocumentCategory;
      }
    }

    // Calculate confidence (normalized score)
    const confidence = totalScore > 0 ? Math.min(bestScore / totalScore, 1.0) : 0;

    // If confidence too low, classify as 'other'
    if (confidence < 0.3 || bestScore < 10) {
      return { category: 'other', confidence: 0 };
    }

    return { category: bestCategory, confidence };
  }

  /**
   * Extract category-specific data
   */
  private extractCategoryData(category: DocumentCategory, content: string): Record<string, any> {
    const data: Record<string, any> = {};

    // Common patterns
    const patterns = {
      amount: /\$?[\d,]+\.?\d{0,2}/g,
      date: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g,
      invoiceNumber: /(?:invoice|inv)[\s#:]*(\d+)/i,
      orderNumber: /(?:order|po)[\s#:]*(\d+)/i,
      email: /[\w\.-]+@[\w\.-]+\.\w+/g,
      phone: /\(?\d{3}\)?[\s\.-]?\d{3}[\s\.-]?\d{4}/g,
    };

    // Extract based on category
    switch (category) {
      case 'invoice':
      case 'receipt':
        const amounts = content.match(patterns.amount);
        if (amounts && amounts.length > 0) {
          data.amounts = amounts;
          data.total = amounts[amounts.length - 1]; // Usually last amount is total
        }
        const invoiceNum = content.match(patterns.invoiceNumber);
        if (invoiceNum) data.invoiceNumber = invoiceNum[1];
        break;

      case 'change_order':
        const orderNum = content.match(patterns.orderNumber);
        if (orderNum) data.orderNumber = orderNum[1];
        break;

      case 'contract':
        const dates = content.match(patterns.date);
        if (dates) data.dates = dates;
        break;
    }

    // Extract common fields
    const emails = content.match(patterns.email);
    if (emails) data.emails = emails;

    const phones = content.match(patterns.phone);
    if (phones) data.phones = phones;

    return data;
  }

  /**
   * Generate organization suggestions
   */
  private generateSuggestions(category: DocumentCategory, data: Record<string, any>): string[] {
    const suggestions: string[] = [];

    switch (category) {
      case 'invoice':
        suggestions.push('Link to project expenses');
        if (data.invoiceNumber) {
          suggestions.push(`Track invoice #${data.invoiceNumber}`);
        }
        suggestions.push('Set up payment reminder');
        break;

      case 'contract':
        suggestions.push('Link to project details');
        suggestions.push('Set milestone reminders');
        suggestions.push('Add to contract register');
        break;

      case 'change_order':
        suggestions.push('Update project budget');
        suggestions.push('Notify project manager');
        suggestions.push('Track cost variance');
        break;

      case 'daily_report':
        suggestions.push('Link to project timeline');
        suggestions.push('Track daily progress');
        break;

      case 'permit':
        suggestions.push('Add to permit tracker');
        suggestions.push('Set expiration reminder');
        break;

      case 'photo':
        suggestions.push('Add to project gallery');
        suggestions.push('Tag location and date');
        break;
    }

    return suggestions;
  }

  /**
   * Detect document metadata
   */
  private detectMetadata(features: DocumentFeatures): ClassificationResult['metadata'] {
    const content = features.content || '';

    return {
      detectedFields: this.detectFields(content),
      hasSignature: /signature|signed|sign here/i.test(content),
      hasLogo: features.fileType === 'image' || features.fileType === 'pdf',
    };
  }

  /**
   * Detect important fields in content
   */
  private detectFields(content: string): string[] {
    const fields: string[] = [];

    const fieldPatterns = {
      'Amount': /\$[\d,]+\.?\d{0,2}/,
      'Date': /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/,
      'Invoice Number': /invoice[\s#:]*\d+/i,
      'Order Number': /(?:order|po)[\s#:]*\d+/i,
      'Email': /[\w\.-]+@[\w\.-]+\.\w+/,
      'Phone': /\(?\d{3}\)?[\s\.-]?\d{3}[\s\.-]?\d{4}/,
      'Address': /\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way)/i,
    };

    for (const [field, pattern] of Object.entries(fieldPatterns)) {
      if (pattern.test(content)) {
        fields.push(field);
      }
    }

    return fields;
  }

  /**
   * Batch classify multiple documents
   */
  async classifyBatch(documents: DocumentFeatures[]): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];

    for (const doc of documents) {
      const result = await this.classifyDocument(doc);
      results.push(result);
    }

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
  }
}

// Export singleton instance
export const documentClassifier = new DocumentClassifierService();
