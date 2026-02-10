/**
 * Expanded Template Collection - 5000 Workflow Templates
 *
 * Programmatic generator producing ~4970 unique templates from seed data.
 * Combined with 30 base templates from collector.ts = 5000 total.
 *
 * Generator uses 25 industry categories × 5 subcategories × ~14 integration pairs × 3 complexity levels.
 */

import type { RawTemplate } from './collector';

interface CatSeed {
  name: string;
  slug: string;
  subs: string[];
  pairs: [string, string][];
  nodes: string[];
  tags: string[];
  desc: string;
  patterns: [string, string, string];
  useCases: string[];
}

const CATS: CatSeed[] = [
  {
    name: 'Data Synchronization', slug: 'sync',
    subs: ['Database Replication', 'Cloud Storage Migration', 'SaaS Platform Bridge', 'Real-time Streaming', 'Batch ETL'],
    pairs: [
      ['PostgreSQL', 'MySQL'], ['MongoDB', 'Elasticsearch'], ['Salesforce', 'HubSpot'], ['Google Sheets', 'Airtable'],
      ['AWS S3', 'Azure Blob'], ['Shopify', 'WooCommerce'], ['Redis', 'PostgreSQL'], ['Slack', 'Microsoft Teams'],
      ['Jira', 'GitHub'], ['Stripe', 'QuickBooks'], ['Zendesk', 'Salesforce'], ['Mailchimp', 'HubSpot'],
      ['Google Drive', 'Dropbox'], ['Notion', 'Confluence'],
    ],
    nodes: ['Schedule Trigger', 'Data Mapper', 'Validator', 'Error Handler', 'Merge', 'Filter', 'Batch Processor'],
    tags: ['sync', 'data-transfer', 'integration', 'automation'],
    desc: 'Automated data synchronization workflow',
    patterns: ['Schedule → Extract → Load', 'Trigger → Transform → Sync → Verify', 'Event → Compare → Merge → Validate → Notify'],
    useCases: ['Cross-platform data consistency', 'System migration', 'Backup and recovery'],
  },
  {
    name: 'AI & Machine Learning', slug: 'ai',
    subs: ['Content Generation', 'Data Analysis', 'Chatbot & Agents', 'Image Processing', 'Predictive Analytics'],
    pairs: [
      ['OpenAI', 'Pinecone'], ['Anthropic', 'Weaviate'], ['OpenAI', 'Google Sheets'], ['DALL-E', 'WordPress'],
      ['OpenAI', 'Slack'], ['Hugging Face', 'PostgreSQL'], ['OpenAI', 'Email'], ['Anthropic', 'Notion'],
      ['OpenAI', 'Airtable'], ['GPT-4', 'Salesforce'], ['OpenAI', 'Google Drive'], ['Midjourney', 'Instagram'],
      ['OpenAI', 'Zendesk'], ['Claude', 'GitHub'],
    ],
    nodes: ['Webhook', 'HTTP Request', 'Code', 'IF', 'Merge', 'Error Handler', 'AI Agent'],
    tags: ['ai', 'machine-learning', 'automation', 'intelligent'],
    desc: 'AI-powered automation workflow',
    patterns: ['Trigger → Analyze → Output', 'Input → AI Process → Validate → Store → Notify', 'Collect → AI Analyze → Decide → Act → Monitor → Report'],
    useCases: ['Content automation', 'Intelligent data processing', 'AI-assisted decision making'],
  },
  {
    name: 'Marketing Automation', slug: 'mktg',
    subs: ['Email Campaigns', 'Lead Nurturing', 'Social Media Marketing', 'SEO & Content', 'Campaign Analytics'],
    pairs: [
      ['Mailchimp', 'Salesforce'], ['HubSpot', 'Facebook Ads'], ['SendGrid', 'Google Analytics'], ['Typeform', 'Mailchimp'],
      ['LinkedIn', 'HubSpot'], ['Twitter', 'Buffer'], ['Google Ads', 'Google Sheets'], ['ActiveCampaign', 'Shopify'],
      ['Clearbit', 'HubSpot'], ['Intercom', 'Mailchimp'], ['Unbounce', 'HubSpot'], ['Calendly', 'Salesforce'],
      ['YouTube', 'WordPress'], ['Marketo', 'Salesforce'],
    ],
    nodes: ['Schedule Trigger', 'Email Send', 'IF', 'CRM', 'Analytics', 'Segmentation', 'A/B Test'],
    tags: ['marketing', 'campaigns', 'leads', 'email', 'automation'],
    desc: 'Marketing automation workflow',
    patterns: ['Trigger → Segment → Send', 'Capture → Qualify → Nurture → Convert → Analyze', 'Monitor → Analyze → Optimize → Report → Iterate → Scale'],
    useCases: ['Lead generation', 'Campaign optimization', 'Customer engagement'],
  },
  {
    name: 'E-commerce Operations', slug: 'ecom',
    subs: ['Order Management', 'Inventory Control', 'Customer Experience', 'Pricing & Revenue', 'Payment Processing'],
    pairs: [
      ['Shopify', 'Stripe'], ['WooCommerce', 'PayPal'], ['Shopify', 'ShipStation'], ['Amazon', 'Shopify'],
      ['Stripe', 'QuickBooks'], ['Shopify', 'Mailchimp'], ['WooCommerce', 'SendGrid'], ['Shopify', 'Zendesk'],
      ['BigCommerce', 'Stripe'], ['Etsy', 'Shopify'], ['eBay', 'ShipStation'], ['Shopify', 'Slack'],
      ['WooCommerce', 'Google Sheets'], ['Square', 'QuickBooks'],
    ],
    nodes: ['Webhook', 'Order Processor', 'Inventory Check', 'Payment Gateway', 'Email Send', 'Notification', 'Error Handler'],
    tags: ['e-commerce', 'orders', 'inventory', 'payments', 'automation'],
    desc: 'E-commerce operations automation workflow',
    patterns: ['Event → Process → Notify', 'Order → Validate → Fulfill → Ship → Track → Notify', 'Monitor → Analyze → Optimize → Update → Report → Alert'],
    useCases: ['Order fulfillment', 'Inventory management', 'Customer communication'],
  },
  {
    name: 'IT Operations', slug: 'itops',
    subs: ['Infrastructure Monitoring', 'Incident Response', 'Security Scanning', 'CI/CD Automation', 'Configuration Management'],
    pairs: [
      ['Datadog', 'PagerDuty'], ['GitHub', 'Slack'], ['Jenkins', 'GitHub'], ['Docker', 'AWS'],
      ['Terraform', 'Slack'], ['Prometheus', 'Grafana'], ['Sentry', 'Jira'], ['New Relic', 'PagerDuty'],
      ['AWS', 'Azure'], ['CircleCI', 'GitHub'], ['Ansible', 'Slack'], ['Kubernetes', 'Datadog'],
      ['CloudWatch', 'Slack'], ['GitLab', 'Jira'],
    ],
    nodes: ['Schedule Trigger', 'HTTP Request', 'IF', 'Slack', 'Code', 'Error Handler', 'Alert Manager'],
    tags: ['devops', 'monitoring', 'incidents', 'ci-cd', 'automation'],
    desc: 'IT operations automation workflow',
    patterns: ['Poll → Check → Alert', 'Detect → Analyze → Respond → Recover → Notify', 'Scan → Assess → Remediate → Verify → Report → Audit'],
    useCases: ['System monitoring', 'Incident management', 'Security compliance'],
  },
  {
    name: 'Customer Support', slug: 'support',
    subs: ['Ticket Management', 'Live Chat Automation', 'Knowledge Base', 'Quality Assurance', 'Customer Analytics'],
    pairs: [
      ['Zendesk', 'Slack'], ['Intercom', 'Salesforce'], ['Freshdesk', 'Jira'], ['Zendesk', 'HubSpot'],
      ['Intercom', 'Slack'], ['Freshdesk', 'Asana'], ['Zendesk', 'Google Sheets'], ['Intercom', 'Notion'],
      ['Help Scout', 'Slack'], ['Zendesk', 'Twilio'], ['Freshdesk', 'Mailchimp'], ['Drift', 'Salesforce'],
      ['Zendesk', 'PagerDuty'], ['LiveChat', 'HubSpot'],
    ],
    nodes: ['Webhook', 'Ticket Router', 'AI Classifier', 'Email Send', 'Slack', 'Error Handler', 'SLA Monitor'],
    tags: ['support', 'tickets', 'customer-service', 'helpdesk', 'automation'],
    desc: 'Customer support automation workflow',
    patterns: ['Receive → Route → Respond', 'Ticket → Classify → Assign → Resolve → Feedback', 'Monitor → Analyze → Escalate → Resolve → Report → Improve'],
    useCases: ['Ticket routing', 'Response automation', 'Customer satisfaction'],
  },
  {
    name: 'Content Management', slug: 'content',
    subs: ['Content Creation', 'Publishing Pipeline', 'Asset Management', 'SEO Optimization', 'Content Analytics'],
    pairs: [
      ['WordPress', 'Twitter'], ['Notion', 'WordPress'], ['Ghost', 'Mailchimp'], ['Contentful', 'Netlify'],
      ['WordPress', 'LinkedIn'], ['Medium', 'Twitter'], ['Notion', 'Slack'], ['WordPress', 'Facebook'],
      ['Ghost', 'Twitter'], ['Contentful', 'Algolia'], ['WordPress', 'Pinterest'], ['Notion', 'Google Docs'],
      ['Sanity', 'Vercel'], ['Strapi', 'Netlify'],
    ],
    nodes: ['Schedule Trigger', 'CMS', 'Content Formatter', 'Social Publisher', 'SEO Checker', 'Analytics', 'Image Processor'],
    tags: ['content', 'publishing', 'cms', 'social-media', 'automation'],
    desc: 'Content management automation workflow',
    patterns: ['Create → Format → Publish', 'Plan → Create → Review → Optimize → Distribute → Analyze', 'Source → Process → Adapt → Schedule → Publish → Monitor → Report'],
    useCases: ['Content publishing', 'Multi-platform distribution', 'SEO optimization'],
  },
  {
    name: 'Finance & Accounting', slug: 'finance',
    subs: ['Invoice Processing', 'Expense Management', 'Financial Reporting', 'Tax Compliance', 'Budget Planning'],
    pairs: [
      ['Stripe', 'QuickBooks'], ['Xero', 'Slack'], ['QuickBooks', 'Google Sheets'], ['Stripe', 'Xero'],
      ['PayPal', 'QuickBooks'], ['Plaid', 'Google Sheets'], ['QuickBooks', 'Slack'], ['Xero', 'HubSpot'],
      ['Stripe', 'Airtable'], ['Wave', 'Google Sheets'], ['FreshBooks', 'Slack'], ['Brex', 'QuickBooks'],
      ['Gusto', 'QuickBooks'], ['Razorpay', 'Airtable'],
    ],
    nodes: ['Schedule Trigger', 'Invoice Generator', 'Payment Tracker', 'Email Send', 'Accounting API', 'Error Handler', 'Report Builder'],
    tags: ['finance', 'accounting', 'invoicing', 'payments', 'automation'],
    desc: 'Finance and accounting automation workflow',
    patterns: ['Schedule → Generate → Send', 'Collect → Process → Validate → Record → Report', 'Aggregate → Analyze → Reconcile → Report → Alert → Archive'],
    useCases: ['Invoice automation', 'Expense tracking', 'Financial reporting'],
  },
  {
    name: 'Human Resources', slug: 'hr',
    subs: ['Recruitment Pipeline', 'Employee Onboarding', 'Performance Management', 'Learning & Development', 'Employee Wellness'],
    pairs: [
      ['BambooHR', 'Slack'], ['Workday', 'Google Sheets'], ['Lever', 'Slack'], ['Greenhouse', 'Google Sheets'],
      ['BambooHR', 'Google Calendar'], ['Gusto', 'Slack'], ['ADP', 'Google Sheets'], ['Rippling', 'Slack'],
      ['Lever', 'HubSpot'], ['Greenhouse', 'Notion'], ['BambooHR', 'Jira'], ['Workday', 'Salesforce'],
      ['Lever', 'Asana'], ['Deel', 'Slack'],
    ],
    nodes: ['Webhook', 'HR System', 'Email Send', 'Calendar', 'Slack', 'Document Generator', 'Error Handler'],
    tags: ['hr', 'recruitment', 'onboarding', 'employees', 'automation'],
    desc: 'Human resources automation workflow',
    patterns: ['Trigger → Process → Notify', 'Post → Screen → Interview → Evaluate → Hire', 'Plan → Execute → Track → Review → Optimize → Report'],
    useCases: ['Recruitment automation', 'Onboarding streamlining', 'Performance tracking'],
  },
  {
    name: 'Project Management', slug: 'pm',
    subs: ['Task Automation', 'Sprint Planning', 'Resource Allocation', 'Risk Management', 'Stakeholder Reporting'],
    pairs: [
      ['Jira', 'Slack'], ['Asana', 'Google Sheets'], ['Trello', 'Slack'], ['Monday.com', 'Slack'],
      ['ClickUp', 'GitHub'], ['Linear', 'Slack'], ['Notion', 'Jira'], ['Asana', 'Slack'],
      ['Trello', 'Google Sheets'], ['Monday.com', 'GitHub'], ['ClickUp', 'Slack'], ['Linear', 'GitHub'],
      ['Basecamp', 'Slack'], ['Todoist', 'Google Sheets'],
    ],
    nodes: ['Schedule Trigger', 'Project Tool', 'Task Creator', 'Slack', 'Report Generator', 'Calendar', 'Error Handler'],
    tags: ['project-management', 'tasks', 'sprints', 'tracking', 'automation'],
    desc: 'Project management automation workflow',
    patterns: ['Schedule → Update → Notify', 'Plan → Assign → Track → Review → Report', 'Analyze → Prioritize → Schedule → Execute → Monitor → Report'],
    useCases: ['Task automation', 'Progress tracking', 'Team coordination'],
  },
  {
    name: 'Sales Operations', slug: 'sales',
    subs: ['Pipeline Management', 'Lead Scoring', 'Territory Planning', 'Commission Tracking', 'Sales Forecasting'],
    pairs: [
      ['Salesforce', 'Slack'], ['HubSpot', 'Gmail'], ['Pipedrive', 'Slack'], ['Close', 'Google Sheets'],
      ['Salesforce', 'LinkedIn'], ['HubSpot', 'Calendly'], ['Apollo', 'Salesforce'], ['Outreach', 'Salesforce'],
      ['SalesLoft', 'HubSpot'], ['Gong', 'Salesforce'], ['ZoomInfo', 'HubSpot'], ['Clearbit', 'Salesforce'],
      ['Lemlist', 'HubSpot'], ['LinkedIn', 'Salesforce'],
    ],
    nodes: ['Webhook', 'CRM', 'Lead Scorer', 'Email Send', 'Slack', 'Analytics', 'Error Handler'],
    tags: ['sales', 'pipeline', 'leads', 'crm', 'automation'],
    desc: 'Sales operations automation workflow',
    patterns: ['Capture → Score → Route', 'Prospect → Qualify → Engage → Close → Analyze', 'Monitor → Forecast → Optimize → Execute → Report → Iterate'],
    useCases: ['Lead qualification', 'Pipeline management', 'Sales forecasting'],
  },
  {
    name: 'Healthcare', slug: 'health',
    subs: ['Patient Records', 'Appointment Scheduling', 'Lab Results Processing', 'Medical Billing', 'Compliance Monitoring'],
    pairs: [
      ['Epic', 'Slack'], ['Cerner', 'Google Sheets'], ['DrChrono', 'Twilio'], ['Kareo', 'Google Calendar'],
      ['SimplePractice', 'Stripe'], ['Athena', 'Email'], ['NextGen', 'Twilio'], ['Allscripts', 'Slack'],
      ['Practice Fusion', 'Google Sheets'], ['AdvancedMD', 'Slack'], ['CareCloud', 'Email'], ['Elation', 'Twilio'],
      ['CharmHealth', 'Stripe'], ['eClinicalWorks', 'Slack'],
    ],
    nodes: ['Schedule Trigger', 'EHR System', 'HIPAA Filter', 'Email Send', 'SMS', 'Appointment Scheduler', 'Error Handler'],
    tags: ['healthcare', 'patients', 'ehr', 'hipaa', 'automation'],
    desc: 'Healthcare automation workflow',
    patterns: ['Schedule → Process → Notify', 'Receive → Validate → Process → Store → Notify', 'Monitor → Analyze → Comply → Report → Alert → Archive'],
    useCases: ['Patient management', 'Appointment automation', 'Compliance tracking'],
  },
  {
    name: 'Education Technology', slug: 'edu',
    subs: ['Course Management', 'Student Assessment', 'Parent Communication', 'Resource Library', 'Learning Analytics'],
    pairs: [
      ['Canvas', 'Slack'], ['Moodle', 'Google Sheets'], ['Google Classroom', 'Slack'], ['Schoology', 'Email'],
      ['Canvas', 'Zoom'], ['Moodle', 'Slack'], ['Teachable', 'Mailchimp'], ['Thinkific', 'Stripe'],
      ['Blackboard', 'Google Sheets'], ['Coursera', 'Slack'], ['Udemy', 'Google Sheets'], ['EdX', 'Email'],
      ['Kajabi', 'Stripe'], ['Podia', 'Mailchimp'],
    ],
    nodes: ['Schedule Trigger', 'LMS', 'Email Send', 'Grade Calculator', 'Notification', 'Calendar', 'Error Handler'],
    tags: ['education', 'lms', 'courses', 'students', 'automation'],
    desc: 'Education technology automation workflow',
    patterns: ['Schedule → Generate → Distribute', 'Create → Assign → Grade → Feedback → Report', 'Monitor → Analyze → Intervene → Support → Track → Optimize'],
    useCases: ['Course automation', 'Assessment management', 'Student engagement'],
  },
  {
    name: 'Real Estate', slug: 'realestate',
    subs: ['Property Listings', 'Lead Management', 'Transaction Processing', 'Virtual Tours', 'Market Analysis'],
    pairs: [
      ['Zillow', 'Google Sheets'], ['MLS', 'HubSpot'], ['DocuSign', 'Google Drive'], ['Follow Up Boss', 'Gmail'],
      ['Realtor.com', 'HubSpot'], ['CoStar', 'Slack'], ['Buildium', 'QuickBooks'], ['AppFolio', 'Slack'],
      ['Zillow', 'Airtable'], ['MLS', 'Mailchimp'], ['Knock', 'HubSpot'], ['BoomTown', 'Salesforce'],
      ['kvCORE', 'Gmail'], ['Propertyware', 'QuickBooks'],
    ],
    nodes: ['Webhook', 'MLS API', 'CRM', 'Email Send', 'Document Generator', 'Calendar', 'Error Handler'],
    tags: ['real-estate', 'listings', 'property', 'transactions', 'automation'],
    desc: 'Real estate automation workflow',
    patterns: ['List → Market → Capture', 'Source → Qualify → Show → Negotiate → Close', 'Monitor → Analyze → Price → Market → Track → Report'],
    useCases: ['Listing management', 'Lead nurturing', 'Transaction coordination'],
  },
  {
    name: 'Legal Operations', slug: 'legal',
    subs: ['Contract Lifecycle', 'Case Management', 'Compliance Monitoring', 'Legal Research', 'Time & Billing'],
    pairs: [
      ['DocuSign', 'Salesforce'], ['Clio', 'QuickBooks'], ['PandaDoc', 'HubSpot'], ['DocuSign', 'Slack'],
      ['Clio', 'Slack'], ['NetDocuments', 'Slack'], ['Clio', 'Stripe'], ['LawPay', 'QuickBooks'],
      ['DocuSign', 'Notion'], ['Smokeball', 'Google Sheets'], ['PracticePanther', 'Slack'], ['MyCase', 'QuickBooks'],
      ['CosmoLex', 'Slack'], ['Rocket Matter', 'Stripe'],
    ],
    nodes: ['Webhook', 'Document Manager', 'Approval Workflow', 'Email Send', 'Time Tracker', 'Billing', 'Error Handler'],
    tags: ['legal', 'contracts', 'compliance', 'billing', 'automation'],
    desc: 'Legal operations automation workflow',
    patterns: ['Draft → Review → Sign', 'Create → Review → Approve → Execute → Archive', 'Monitor → Detect → Assess → Remediate → Report → Audit'],
    useCases: ['Contract management', 'Case tracking', 'Compliance automation'],
  },
  {
    name: 'Supply Chain', slug: 'supplychain',
    subs: ['Procurement Automation', 'Logistics Tracking', 'Warehouse Management', 'Vendor Management', 'Quality Control'],
    pairs: [
      ['SAP', 'Slack'], ['Oracle', 'Google Sheets'], ['ShipStation', 'Shopify'], ['FedEx', 'Slack'],
      ['UPS', 'Google Sheets'], ['DHL', 'Airtable'], ['Flexport', 'Slack'], ['ShipBob', 'Shopify'],
      ['EasyPost', 'Slack'], ['Freightos', 'Google Sheets'], ['Shippo', 'Shopify'], ['TradeGecko', 'QuickBooks'],
      ['Cin7', 'Shopify'], ['Ordoro', 'Google Sheets'],
    ],
    nodes: ['Schedule Trigger', 'ERP System', 'Shipping API', 'Inventory Check', 'Email Send', 'Slack', 'Error Handler'],
    tags: ['supply-chain', 'logistics', 'shipping', 'warehouse', 'automation'],
    desc: 'Supply chain automation workflow',
    patterns: ['Order → Ship → Track', 'Plan → Source → Receive → Store → Distribute', 'Monitor → Forecast → Optimize → Execute → Verify → Report'],
    useCases: ['Order fulfillment', 'Shipment tracking', 'Inventory optimization'],
  },
  {
    name: 'Manufacturing', slug: 'mfg',
    subs: ['Production Scheduling', 'Quality Assurance', 'Preventive Maintenance', 'Inventory Management', 'IoT Integration'],
    pairs: [
      ['SAP', 'Slack'], ['Oracle', 'Google Sheets'], ['Fishbowl', 'QuickBooks'], ['Katana', 'Shopify'],
      ['MaintainX', 'Slack'], ['Plex', 'Google Sheets'], ['Epicor', 'Slack'], ['Arena', 'Jira'],
      ['Tulip', 'Google Sheets'], ['InFlow', 'QuickBooks'], ['Upkeep', 'Slack'], ['Fiix', 'Google Sheets'],
      ['MasterControl', 'Slack'], ['BatchMaster', 'Google Sheets'],
    ],
    nodes: ['Schedule Trigger', 'MES System', 'Quality Check', 'IoT Sensor', 'Alert Manager', 'Report Builder', 'Error Handler'],
    tags: ['manufacturing', 'production', 'quality', 'maintenance', 'automation'],
    desc: 'Manufacturing automation workflow',
    patterns: ['Schedule → Produce → Check', 'Plan → Execute → Inspect → Adjust → Report', 'Monitor → Predict → Schedule → Execute → Verify → Optimize'],
    useCases: ['Production optimization', 'Quality monitoring', 'Maintenance scheduling'],
  },
  {
    name: 'Nonprofit Operations', slug: 'nonprofit',
    subs: ['Fundraising Campaigns', 'Volunteer Management', 'Event Planning', 'Grant Reporting', 'Donor Communications'],
    pairs: [
      ['Salesforce', 'Mailchimp'], ['Donorbox', 'Google Sheets'], ['Classy', 'Slack'], ['Bloomerang', 'Email'],
      ['Eventbrite', 'Google Sheets'], ['Network for Good', 'Mailchimp'], ['GiveButter', 'Slack'], ['Keela', 'Google Sheets'],
      ['WildApricot', 'Mailchimp'], ['Kindful', 'Slack'], ['NeonCRM', 'Google Sheets'], ['Little Green Light', 'Mailchimp'],
      ['Fundly', 'Slack'], ['CharityEngine', 'Email'],
    ],
    nodes: ['Schedule Trigger', 'Donation Tracker', 'Email Send', 'CRM', 'Report Generator', 'Event Manager', 'Error Handler'],
    tags: ['nonprofit', 'fundraising', 'donors', 'volunteers', 'automation'],
    desc: 'Nonprofit operations automation workflow',
    patterns: ['Campaign → Collect → Thank', 'Plan → Launch → Track → Engage → Report', 'Identify → Engage → Cultivate → Solicit → Steward → Analyze'],
    useCases: ['Donation management', 'Volunteer coordination', 'Donor engagement'],
  },
  {
    name: 'Media & Entertainment', slug: 'media',
    subs: ['Content Production', 'Distribution Pipeline', 'Audience Engagement', 'Monetization', 'Rights Management'],
    pairs: [
      ['YouTube', 'Google Sheets'], ['Spotify', 'Slack'], ['Vimeo', 'WordPress'], ['Wistia', 'HubSpot'],
      ['SoundCloud', 'Twitter'], ['Canva', 'Instagram'], ['YouTube', 'Mailchimp'], ['TikTok', 'Google Sheets'],
      ['Twitch', 'Discord'], ['Buzzsprout', 'Twitter'], ['Anchor', 'Mailchimp'], ['Podbean', 'Google Sheets'],
      ['Descript', 'Google Drive'], ['StreamYard', 'Slack'],
    ],
    nodes: ['Webhook', 'Media Processor', 'Content Distributor', 'Analytics', 'Email Send', 'Social Publisher', 'Error Handler'],
    tags: ['media', 'entertainment', 'video', 'audio', 'automation'],
    desc: 'Media and entertainment automation workflow',
    patterns: ['Upload → Process → Publish', 'Create → Edit → Optimize → Distribute → Monetize', 'Produce → Package → Schedule → Distribute → Analyze → Optimize'],
    useCases: ['Content distribution', 'Audience growth', 'Revenue optimization'],
  },
  {
    name: 'Travel & Hospitality', slug: 'travel',
    subs: ['Booking Management', 'Guest Experience', 'Revenue Optimization', 'Tour Operations', 'Review Management'],
    pairs: [
      ['Booking.com', 'Google Sheets'], ['Airbnb', 'Slack'], ['Guesty', 'Stripe'], ['Cloudbeds', 'Google Sheets'],
      ['Hostaway', 'Slack'], ['Lodgify', 'Mailchimp'], ['Mews', 'Stripe'], ['Little Hotelier', 'Slack'],
      ['Checkfront', 'Stripe'], ['Hospitable', 'Google Sheets'], ['Tokeet', 'Slack'], ['Beds24', 'Google Sheets'],
      ['Sirvoy', 'Email'], ['Hotelogix', 'Slack'],
    ],
    nodes: ['Webhook', 'Booking Engine', 'Guest Communicator', 'Payment Processor', 'Calendar', 'Review Monitor', 'Error Handler'],
    tags: ['travel', 'hospitality', 'bookings', 'guests', 'automation'],
    desc: 'Travel and hospitality automation workflow',
    patterns: ['Book → Confirm → Welcome', 'Reserve → Prepare → Serve → Follow-up → Review', 'Forecast → Price → Market → Book → Serve → Analyze'],
    useCases: ['Booking automation', 'Guest communication', 'Revenue management'],
  },
  {
    name: 'Insurance', slug: 'insurance',
    subs: ['Claims Processing', 'Policy Management', 'Underwriting', 'Customer Portal', 'Risk Assessment'],
    pairs: [
      ['Salesforce', 'DocuSign'], ['Applied Epic', 'Google Sheets'], ['EZLynx', 'Slack'], ['HawkSoft', 'Email'],
      ['Vertafore', 'Google Sheets'], ['AgencyBloc', 'Slack'], ['Majesco', 'Google Sheets'], ['Socotra', 'Slack'],
      ['BriteCore', 'Email'], ['Duck Creek', 'Google Sheets'], ['Guidewire', 'Slack'], ['Insly', 'Google Sheets'],
      ['PolicyCenter', 'Email'], ['Zywave', 'Slack'],
    ],
    nodes: ['Webhook', 'Claims Engine', 'Policy Manager', 'Underwriting AI', 'Email Send', 'Document Generator', 'Error Handler'],
    tags: ['insurance', 'claims', 'policies', 'underwriting', 'automation'],
    desc: 'Insurance automation workflow',
    patterns: ['Submit → Process → Pay', 'File → Assess → Investigate → Decide → Settle', 'Evaluate → Price → Issue → Service → Renew → Analyze'],
    useCases: ['Claims automation', 'Policy management', 'Risk evaluation'],
  },
  {
    name: 'Telecommunications', slug: 'telecom',
    subs: ['Network Monitoring', 'Service Provisioning', 'Customer Care', 'Billing Automation', 'Field Operations'],
    pairs: [
      ['ServiceNow', 'Slack'], ['Salesforce', 'Twilio'], ['Cisco', 'PagerDuty'], ['ServiceNow', 'Jira'],
      ['Nokia', 'Google Sheets'], ['Ericsson', 'Slack'], ['Juniper', 'PagerDuty'], ['Amdocs', 'Google Sheets'],
      ['Netcracker', 'Slack'], ['CSG', 'Google Sheets'], ['Comverse', 'Email'], ['MATRIXX', 'Slack'],
      ['Optiva', 'Google Sheets'], ['Cerillion', 'Slack'],
    ],
    nodes: ['Schedule Trigger', 'Network Monitor', 'Ticket System', 'SMS', 'Email Send', 'Alert Manager', 'Error Handler'],
    tags: ['telecom', 'network', 'provisioning', 'billing', 'automation'],
    desc: 'Telecommunications automation workflow',
    patterns: ['Monitor → Alert → Respond', 'Detect → Diagnose → Repair → Verify → Report', 'Provision → Activate → Monitor → Bill → Support → Optimize'],
    useCases: ['Network management', 'Service delivery', 'Customer support'],
  },
  {
    name: 'Energy & Utilities', slug: 'energy',
    subs: ['Grid Monitoring', 'Consumption Tracking', 'Outage Management', 'Regulatory Compliance', 'Customer Billing'],
    pairs: [
      ['SCADA', 'Slack'], ['Schneider', 'Google Sheets'], ['Siemens', 'PagerDuty'], ['GE', 'Email'],
      ['ABB', 'Slack'], ['Honeywell', 'PagerDuty'], ['Emerson', 'Google Sheets'], ['OSIsoft', 'Slack'],
      ['Itron', 'Email'], ['EnergyHub', 'Slack'], ['Landis+Gyr', 'Google Sheets'], ['AutoGrid', 'Slack'],
      ['GridPoint', 'Email'], ['Opower', 'Google Sheets'],
    ],
    nodes: ['Schedule Trigger', 'SCADA Interface', 'Meter Reader', 'Alert Manager', 'Billing System', 'Compliance Checker', 'Error Handler'],
    tags: ['energy', 'utilities', 'grid', 'monitoring', 'automation'],
    desc: 'Energy and utilities automation workflow',
    patterns: ['Monitor → Measure → Bill', 'Detect → Assess → Dispatch → Repair → Verify', 'Monitor → Predict → Optimize → Control → Report → Comply'],
    useCases: ['Grid monitoring', 'Usage billing', 'Outage response'],
  },
  {
    name: 'Agriculture Technology', slug: 'agri',
    subs: ['Crop Management', 'Weather Monitoring', 'Supply Chain Tracking', 'Equipment Maintenance', 'Market Pricing'],
    pairs: [
      ['John Deere', 'Google Sheets'], ['Climate Corp', 'Slack'], ['Trimble', 'Email'], ['FarmLogs', 'Google Sheets'],
      ['AgLeader', 'Slack'], ['Granular', 'Email'], ['CropX', 'Slack'], ['Farmers Edge', 'Google Sheets'],
      ['AgriWebb', 'Slack'], ['Conservis', 'Email'], ['Bushel', 'Google Sheets'], ['DTN', 'Slack'],
      ['Indigo Ag', 'Email'], ['Ag-Analytics', 'Google Sheets'],
    ],
    nodes: ['Schedule Trigger', 'IoT Sensor', 'Weather API', 'Data Processor', 'Alert Manager', 'Report Builder', 'Error Handler'],
    tags: ['agriculture', 'farming', 'crops', 'iot', 'automation'],
    desc: 'Agriculture technology automation workflow',
    patterns: ['Monitor → Record → Alert', 'Sense → Analyze → Decide → Act → Record', 'Plan → Plant → Monitor → Irrigate → Harvest → Analyze'],
    useCases: ['Crop monitoring', 'Weather alerting', 'Yield optimization'],
  },
  {
    name: 'Government & Public Sector', slug: 'govt',
    subs: ['Citizen Services', 'Document Processing', 'Permit Management', 'Public Safety', 'Budget Oversight'],
    pairs: [
      ['ServiceNow', 'Slack'], ['Salesforce', 'Email'], ['SAP', 'Google Sheets'], ['Oracle', 'Slack'],
      ['Accela', 'Google Sheets'], ['Tyler Technologies', 'Slack'], ['Socrata', 'Google Sheets'], ['CivicPlus', 'Email'],
      ['Granicus', 'Slack'], ['OpenGov', 'Google Sheets'], ['Cartegraph', 'Slack'], ['ClearGov', 'Email'],
      ['Munis', 'Google Sheets'], ['Cityworks', 'Slack'],
    ],
    nodes: ['Webhook', 'Form Processor', 'Approval Workflow', 'Document Generator', 'Email Send', 'Notification', 'Error Handler'],
    tags: ['government', 'public-sector', 'citizen-services', 'compliance', 'automation'],
    desc: 'Government and public sector automation workflow',
    patterns: ['Submit → Process → Respond', 'Request → Review → Approve → Issue → Track', 'Collect → Analyze → Report → Publish → Monitor → Comply'],
    useCases: ['Citizen request processing', 'Permit automation', 'Public reporting'],
  },
];

const COMPLEXITIES: ('beginner' | 'intermediate' | 'advanced')[] = ['beginner', 'intermediate', 'advanced'];

const QUALIFIERS: Record<string, string[]> = {
  beginner: ['Quick', 'Simple', 'Basic', 'Starter', 'Essential', 'Lite', 'Express', 'Easy', 'Minimal', 'Core'],
  intermediate: ['Professional', 'Standard', 'Enhanced', 'Complete', 'Integrated', 'Smart', 'Optimized', 'Reliable', 'Robust', 'Full'],
  advanced: ['Enterprise', 'Advanced', 'Comprehensive', 'Intelligent', 'Premium', 'Ultimate', 'Pro', 'Elite', 'Expert', 'Mission-Critical'],
};

const COMPLEXITY_DESC: Record<string, string> = {
  beginner: 'Simple setup for quick deployment with minimal configuration.',
  intermediate: 'Features data validation, error handling, and notifications for reliable operation.',
  advanced: 'Includes comprehensive error handling, monitoring, retry logic, advanced data transformations, and detailed reporting.',
};

const COMPLEXITY_NODES: Record<string, string[]> = {
  beginner: ['Webhook', 'IF'],
  intermediate: ['Webhook', 'IF', 'Merge', 'Error Handler'],
  advanced: ['Webhook', 'IF', 'Merge', 'Error Handler', 'Code', 'Switch', 'Wait'],
};

export function getExpandedTemplates(): RawTemplate[] {
  const templates: RawTemplate[] = [];
  let counter = 0;
  const TARGET = 4970;

  for (const cat of CATS) {
    for (let s = 0; s < cat.subs.length; s++) {
      for (let p = 0; p < cat.pairs.length; p++) {
        for (let c = 0; c < 3; c++) {
          if (counter >= TARGET) return templates;
          counter++;

          const sub = cat.subs[s]!;
          const [intA, intB] = cat.pairs[p]!;
          const complexity = COMPLEXITIES[c]!;
          const subSlug = sub.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const qualifier = QUALIFIERS[complexity]![counter % QUALIFIERS[complexity]!.length]!;

          // Build realistic node list based on complexity
          const nodeCount = complexity === 'advanced' ? 7 : complexity === 'intermediate' ? 5 : 3;
          const extraNodes = COMPLEXITY_NODES[complexity]!;
          const allNodes = [cat.nodes[0] || 'Webhook', intA, ...extraNodes.slice(0, nodeCount - 3), intB, ...cat.nodes.slice(1, nodeCount - 2)].slice(0, nodeCount);

          // Build tags
          const intASlug = intA.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const intBSlug = intB.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const tags = [...cat.tags, intASlug, intBSlug, subSlug, complexity];

          // Build use cases
          const useCases = [
            `${sub} between ${intA} and ${intB}`,
            `Automated ${cat.name.toLowerCase()} using ${intA}`,
            cat.useCases[counter % cat.useCases.length] || 'Process automation',
          ];

          templates.push({
            id: `${cat.slug}-${subSlug}-${String(counter).padStart(4, '0')}`,
            name: `${qualifier} ${sub}: ${intA} to ${intB}`,
            category: cat.name,
            description: `${cat.desc} for ${sub.toLowerCase()} between ${intA} and ${intB}. ${COMPLEXITY_DESC[complexity]}`,
            use_cases: useCases,
            nodes: allNodes,
            integrations: [intA, intB],
            triggers: [allNodes[0]!.includes('Trigger') ? allNodes[0]! : 'Webhook'],
            complexity,
            tags,
            pattern: cat.patterns[c] || cat.patterns[0]!,
          });
        }
      }
    }
  }

  return templates;
}
