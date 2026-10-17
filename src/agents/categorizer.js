/**
 * Tax Categorization Agent (Hardened & Purified)
 * Maps expenses and invoices into IRS Schedule C (Form 1040) categories.
 * 
 * Edge Case Protections:
 * - Tax bracket normalization (handles 25 vs 0.25, clamps 0.05 - 0.50)
 * - Safe null/undefined object handling
 * - Floating point decimal precision rounding
 * - IRS statutory rules (50% meals deduction limit, 100% Section 179 depreciation)
 */

class CategorizerAgent {
  constructor(defaultTaxBracket = 0.25) {
    // Normalize tax bracket: if user passes 25 instead of 0.25
    let bracket = Number(defaultTaxBracket);
    if (isNaN(bracket) || !isFinite(bracket)) bracket = 0.25;
    if (bracket > 1.0) bracket = bracket / 100;
    this.defaultTaxBracket = Math.min(0.50, Math.max(0.05, bracket)); // Clamped between 5% and 50%

    this.categories = {
      'Software & SaaS Subscriptions': {
        keywords: [
          'aws', 'amazon web services', 'github', 'figma', 'slack', 'zoom', 'adobe',
          'google cloud', 'gcp', 'azure', 'digitalocean', 'vercel', 'netlify', 'openai',
          'chatgpt', 'claude', 'anthropic', 'canva', 'dropbox', 'notion', 'jira',
          'atlassian', 'heroku', 'cloudflare', 'domain', 'hosting', 'sublime', 'jetbrains',
          'datadog', 'sentry', 'hubspot', 'mailchimp', 'loom', 'saas', 'software', 'cloudhost'
        ],
        scheduleCLine: 'Line 48 (Other Expenses - Software)',
        deductiblePercent: 1.0,
        description: 'Cloud hosting, SaaS development tools, AI APIs, project management software'
      },
      'Equipment & Hardware': {
        keywords: [
          'apple', 'macbook', 'ipad', 'dell', 'lenovo', 'monitor', 'keyboard', 'mouse',
          'best buy', 'hardware', 'laptop', 'desktop', 'gpu', 'hard drive', 'ssd',
          'webcam', 'microphone', 'headphones', 'cables', 'anker', 'logitech', 'usb-c'
        ],
        scheduleCLine: 'Line 13 (Depreciation) or Section 179 deduction',
        deductiblePercent: 1.0,
        description: 'Computers, monitors, peripherals, audio/video gear used for work'
      },
      'Contract Labor & Subcontractors': {
        keywords: [
          'upwork', 'fiverr', 'contractor', 'consulting', 'freelancer', 'subcontractor',
          'development fee', 'design fee', 'copywriting', 'qa testing', 'bounty', 'outsourcing',
          'architecture', 'sprint planning'
        ],
        scheduleCLine: 'Line 11 (Contract Labor)',
        deductiblePercent: 1.0,
        description: 'Payments to external freelancers, contractors, and specialized service providers'
      },
      'Meals & Client Entertainment': {
        keywords: [
          'starbucks', 'coffee', 'cafe', 'restaurant', 'dinner', 'lunch', 'breakfast',
          'bistro', 'food', 'chipotle', 'uber eats', 'doordash', 'grubhub', 'catering',
          'drinks', 'bar', 'blue bottle'
        ],
        scheduleCLine: 'Line 24b (Deductible Meals)',
        deductiblePercent: 0.5, // 50% statutory deduction limit for business meals under IRC § 274(n)
        description: 'Business meals with clients, partners, or during work travel'
      },
      'Travel & Transportation': {
        keywords: [
          'uber', 'lyft', 'taxi', 'cab', 'flight', 'airline', 'delta', 'united', 'american airlines',
          'hotel', 'airbnb', 'marriott', 'hilton', 'parking', 'toll', 'amtrak', 'train',
          'subway', 'rental car', 'hertz', 'enterprise'
        ],
        scheduleCLine: 'Line 24a (Travel)',
        deductiblePercent: 1.0,
        description: 'Client on-site travel, conferences, lodging, and ground transport'
      },
      'Office Supplies & Rent': {
        keywords: [
          'wework', 'regus', 'coworking', 'office depot', 'staples', 'desk', 'chair',
          'stationery', 'paper', 'printer', 'ink', 'shipping', 'fedex', 'ups', 'usps'
        ],
        scheduleCLine: 'Line 18 (Office Expense) & Line 20b (Rent)',
        deductiblePercent: 1.0,
        description: 'Coworking membership, physical office supplies, printing, packaging'
      },
      'Advertising & Marketing': {
        keywords: [
          'google ads', 'facebook ads', 'meta ads', 'instagram', 'twitter ads', 'linkedin ads',
          'sponsored', 'adwords', 'marketing', 'seo', 'promotion', 'branding', 'sponsorship'
        ],
        scheduleCLine: 'Line 8 (Advertising)',
        deductiblePercent: 1.0,
        description: 'Client acquisition, search and social ads, website promotion, promotional assets'
      },
      'Legal & Professional Services': {
        keywords: [
          'attorney', 'lawyer', 'cpa', 'accountant', 'legal', 'tax prep', 'bookkeeper',
          'trademark', 'incorporation', 'delaware', 'stripe atlas', 'notary'
        ],
        scheduleCLine: 'Line 17 (Legal and Professional Services)',
        deductiblePercent: 1.0,
        description: 'Tax consultation, contract review, bookkeeping, and legal advisory'
      },
      'Merchant & Banking Fees': {
        keywords: [
          'stripe fee', 'paypal fee', 'transaction fee', 'wire fee', 'bank charge', 'foreign exchange fee'
        ],
        scheduleCLine: 'Line 10 (Commissions and Fees)',
        deductiblePercent: 1.0,
        description: 'Payment processing fees, transaction costs, and banking charges'
      },
      'Utilities & Telecommunications': {
        keywords: [
          'internet', 'broadband', 'verizon', 'at&t', 't-mobile', 'comcast', 'xfinity',
          'wifi', 'fiber', 'phone bill', 'sim card'
        ],
        scheduleCLine: 'Line 25 (Utilities)',
        deductiblePercent: 0.8, // 80% typical business use ratio
        description: 'Dedicated phone and home-office high-speed internet connection'
      }
    };
  }

  categorize(extractedData = {}) {
    const data = extractedData || {};
    const textToMatch = [
      data.vendor || '',
      data.payment_method || '',
      ...(Array.isArray(data.line_items) ? data.line_items : []).map((i) => (i && i.description ? i.description : ''))
    ].join(' ').toLowerCase();

    let matchedCategory = 'Office Supplies & Rent'; // Safe default category
    let bestScore = 0;

    for (const [categoryName, info] of Object.entries(this.categories)) {
      let score = 0;
      for (const kw of info.keywords) {
        if (textToMatch.includes(kw)) {
          // Weight vendor match higher than line items
          if ((data.vendor || '').toLowerCase().includes(kw)) {
            score += 3;
          } else {
            score += 1;
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        matchedCategory = categoryName;
      }
    }

    const catInfo = this.categories[matchedCategory];
    const totalAmount = typeof data.total === 'number' && !isNaN(data.total) && isFinite(data.total) ? Math.max(0, data.total) : 0;
    const deductibleAmount = +(Math.round(totalAmount * catInfo.deductiblePercent * 100) / 100).toFixed(2);
    const estimatedTaxSavings = +(Math.round(deductibleAmount * this.defaultTaxBracket * 100) / 100).toFixed(2);

    return {
      category: matchedCategory,
      schedule_c_line: catInfo.scheduleCLine,
      deductible_percentage: Math.round(catInfo.deductiblePercent * 100),
      deductible_amount: deductibleAmount,
      estimated_tax_savings: estimatedTaxSavings,
      tax_bracket_assumed: `${Math.round(this.defaultTaxBracket * 100)}%`,
      description: catInfo.description,
      is_deductible: deductibleAmount > 0
    };
  }
}

module.exports = CategorizerAgent;
