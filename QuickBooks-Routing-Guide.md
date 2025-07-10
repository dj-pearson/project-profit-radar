# QuickBooks Data Routing System Guide

## Overview

The QuickBooks Data Routing System is a comprehensive solution for automatically and manually assigning QuickBooks transactions to specific projects in BuildDesk. This system eliminates the manual work of categorizing financial data and ensures accurate project cost tracking.

## 🎯 Key Benefits

### **Automated Intelligence**
- **Smart Pattern Recognition**: Automatically detects project codes, customer names, and keywords
- **Confidence Scoring**: Each auto-suggestion includes a confidence percentage (0-100%)
- **Multi-field Matching**: Can match on memo, reference numbers, customer names, amounts, and more

### **Project Attribution Accuracy**
- **Real-time Assignment**: Transactions are routed as they come in from QuickBooks
- **Historical Processing**: Bulk process existing unrouted transactions
- **Manual Override**: Always maintain control with manual assignment options

### **Comprehensive Audit Trail**
- **Complete History**: Track every routing decision and rule application
- **Performance Analytics**: Monitor rule effectiveness and system performance
- **Error Recovery**: Handle edge cases and review questionable matches

## 🛠️ System Components

### **1. Routing Rules Engine**
**Location**: `/quickbooks-routing` → Routing Rules tab

**Rule Types Available**:
- **Memo/Description Matching**: Search transaction descriptions for keywords
- **Reference Number Patterns**: Match PO numbers, invoice references, job codes
- **Customer/Vendor Names**: Route based on client or supplier names
- **Amount Ranges**: Route transactions within specific dollar ranges
- **Custom Fields**: Match on QuickBooks custom field data
- **Class/Location/Department**: Use QB organizational fields

**Match Types**:
- **Exact Match**: Perfect string match (case-sensitive option)
- **Contains**: Partial string matching (most common)
- **Starts With**: Prefix matching for codes
- **Ends With**: Suffix matching
- **Regular Expression**: Advanced pattern matching
- **Number Range**: For amount-based routing

### **2. Unrouted Transactions Manager**
**Location**: `/quickbooks-routing` → Unrouted Transactions tab

**Features**:
- **Visual Transaction List**: See all unassigned QB transactions
- **Confidence Indicators**: Color-coded confidence scores for suggestions
- **Bulk Assignment**: Select multiple transactions for batch processing
- **One-click Acceptance**: Accept high-confidence suggestions instantly
- **Manual Project Selection**: Assign to any project when auto-routing fails

### **3. Auto-routing Engine**
**Backend Processing**: Automatic rule application with intelligent scoring

**Process Flow**:
1. **Transaction Import**: New QB transactions are imported into the unrouted queue
2. **Rule Application**: All active rules are tested against each transaction
3. **Confidence Calculation**: Matching strength is calculated (0-100%)
4. **Auto-assignment**: High-confidence matches (≥90%) are auto-assigned
5. **Review Queue**: Medium-confidence matches (70-89%) require review
6. **Manual Queue**: Low or no matches remain for manual assignment

## 📋 Setup Guide

### **Step 1: Create Your First Routing Rules**

#### **Common Rule Examples**:

**Project Code Matching**:
- **Name**: "Project Code in Memo"
- **Field**: Memo
- **Match Type**: Regular Expression
- **Value**: `PROJ-\d{3}` (matches PROJ-001, PROJ-002, etc.)
- **Target**: Auto-detect from match

**Customer-Based Routing**:
- **Name**: "Smith Kitchen Project"
- **Field**: Customer Name
- **Match Type**: Contains
- **Value**: "Smith"
- **Target**: Smith Kitchen Renovation Project

**Vendor Category Routing**:
- **Name**: "Home Depot Materials"
- **Field**: Vendor Name
- **Match Type**: Contains
- **Value**: "Home Depot"
- **Target**: Active Materials Project

**Amount-Based Routing**:
- **Name**: "Small Expense Catchall"
- **Field**: Amount Range
- **Match Type**: Range
- **Value**: "0-500"
- **Target**: General Operations Project

### **Step 2: Configure Rule Priority**

**Priority System** (1-100, higher number = higher priority):
- **100**: Exact project code matches
- **50**: Customer/vendor-specific rules
- **25**: Amount-based catchall rules
- **1**: Default fallback rules

### **Step 3: Set Confidence Thresholds**

**Recommended Thresholds**:
- **95-100%**: Auto-assign (no review needed)
- **80-94%**: High confidence, minimal review
- **60-79%**: Medium confidence, require review
- **Below 60%**: Manual assignment recommended

### **Step 4: Test and Refine**

1. **Start with Conservative Rules**: Begin with high-confidence, specific patterns
2. **Monitor Performance**: Check the analytics for rule effectiveness
3. **Adjust Thresholds**: Fine-tune confidence levels based on accuracy
4. **Add Exclusions**: Use exclude patterns to prevent false positives

## 🔄 Daily Workflow

### **Morning Review Process**

1. **Check Unrouted Queue**: Review transactions imported overnight
2. **Process High-Confidence Matches**: Accept obvious auto-suggestions
3. **Review Medium-Confidence**: Manually verify 70-89% confidence matches
4. **Assign Remaining**: Manually route any unmatched transactions

### **Weekly Optimization**

1. **Review Analytics**: Check rule performance and accuracy rates
2. **Update Rules**: Refine patterns based on new transaction types
3. **Add New Rules**: Create rules for recurring unmatched patterns
4. **Clean Up History**: Archive old routing history if needed

## 🎨 Advanced Features

### **Smart Project Detection**

**Auto-detect Project Codes**:
When using regex patterns like `PROJ-\d{3}`, the system can:
- Extract the project code from the transaction
- Look up the corresponding project automatically
- Route without needing to specify a target project

**Multi-line Transaction Handling**:
- Process complex transactions with multiple line items
- Apply different rules to different line items
- Aggregate routing decisions for split transactions

### **Historical Data Processing**

**Bulk Import Process**:
1. **Import Historical Transactions**: Pull in past QB data
2. **Apply Current Rules**: Run existing rules against historical data
3. **Review and Adjust**: Manually review and refine assignments
4. **Generate Historical Reports**: Create project cost reports from past data

### **Integration with Existing Features**

**Cost Code Integration**:
- Rules can assign both project AND cost code
- Support for BuildDesk's detailed cost tracking
- Integration with budget vs. actual reporting

**Budget Impact Analysis**:
- Real-time budget updates as transactions are routed
- Alerts when transactions push projects over budget
- Variance analysis by routing source

## 📊 Analytics and Reporting

### **Performance Metrics**

**Rule Effectiveness**:
- Match rate percentage by rule
- Average confidence scores
- False positive/negative rates
- Time saved through automation

**Processing Statistics**:
- Transactions processed per day/week/month
- Auto-assignment vs. manual assignment ratios
- Review queue size and clearance time
- Error rates and resolution time

**Financial Impact**:
- Total transaction value processed
- Value auto-assigned vs. manually assigned
- Time savings calculation (estimated hours saved)
- Project cost attribution accuracy improvement

### **Regular Reporting**

**Weekly Dashboard**:
- Unrouted transaction count
- Rule performance summary
- Top-performing and underperforming rules
- Recommendations for rule improvements

**Monthly Analysis**:
- Routing accuracy trends
- Rule effectiveness over time
- Project cost attribution completeness
- System optimization recommendations

## 🚨 Troubleshooting Common Issues

### **Rules Not Matching**

**Check These Items**:
1. **Case Sensitivity**: Ensure case settings match your data
2. **Special Characters**: Account for punctuation and symbols
3. **Field Selection**: Verify you're matching the right field
4. **Priority Conflicts**: Higher priority rules may override lower ones

### **False Positives**

**Solutions**:
1. **Add Exclude Patterns**: Specify patterns that should NOT match
2. **Increase Specificity**: Make match patterns more specific
3. **Adjust Confidence Thresholds**: Require higher confidence for auto-assignment
4. **Split Rules**: Break broad rules into more specific ones

### **Performance Issues**

**Optimization Tips**:
1. **Limit Active Rules**: Deactivate unused or ineffective rules
2. **Order by Priority**: Place most common matches at highest priority
3. **Use Specific Patterns**: Avoid overly broad regex patterns
4. **Batch Processing**: Process transactions in groups rather than individually

## 🔧 Technical Implementation

### **Database Schema**

**Core Tables**:
- `quickbooks_routing_rules`: Rule definitions and configuration
- `quickbooks_unrouted_transactions`: Transaction queue and assignments
- `quickbooks_routing_history`: Complete audit trail
- `quickbooks_routing_analytics`: Performance metrics and statistics

### **API Endpoints**

**Edge Functions**:
- `quickbooks-route-transactions`: Main routing engine
- `quickbooks-sync`: Enhanced with routing integration
- Standard QuickBooks sync functions with routing hooks

### **Real-time Processing**

**Webhook Integration**:
- Real-time transaction import from QuickBooks
- Immediate rule application to new transactions
- Live updates to routing dashboard

## 🎯 Best Practices

### **Rule Design**

1. **Start Simple**: Begin with obvious, high-confidence patterns
2. **Be Specific**: Prefer specific rules over broad catchalls
3. **Test Thoroughly**: Validate rules against sample data before activation
4. **Document Rules**: Use clear names and descriptions for future reference

### **Maintenance**

1. **Regular Review**: Check rule performance monthly
2. **Update Patterns**: Adjust rules as business patterns change
3. **Archive Old Data**: Clean up historical routing data periodically
4. **Backup Rules**: Export rule configurations before major changes

### **Team Training**

1. **Role-Based Access**: Train different team members on appropriate features
2. **Review Workflows**: Establish clear processes for reviewing suggestions
3. **Error Handling**: Train staff on resolving routing conflicts
4. **Performance Monitoring**: Teach teams to interpret analytics data

## 🚀 Future Enhancements

### **Planned Features**

**Machine Learning Integration**:
- AI-powered pattern recognition
- Automatic rule suggestion based on manual assignments
- Predictive routing for new transaction types

**Enhanced Integrations**:
- Direct QuickBooks webhook support
- Integration with other accounting systems
- API access for third-party tools

**Advanced Analytics**:
- Predictive project cost forecasting
- Trend analysis and anomaly detection
- Automated optimization recommendations

---

This comprehensive routing system transforms QuickBooks data management from a manual, error-prone process into an intelligent, automated workflow that saves time, improves accuracy, and provides better financial visibility for construction projects.