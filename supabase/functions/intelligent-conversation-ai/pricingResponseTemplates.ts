
// Pricing Response Templates for Enhanced Customer Service
// Specialized templates for handling pricing discrepancies and concerns

export interface PricingTemplateContext {
  leadName: string;
  vehicleInterest: string;
  priceContext?: {
    mentionedOnlinePrice?: boolean;
    mentionedCallPrice?: boolean;
    priceDifference?: string;
    upgradesConcern?: boolean;
  };
  objectionType: string;
}

export const generatePricingResponse = (context: PricingTemplateContext): string => {
  const { leadName, vehicleInterest, priceContext, objectionType } = context;
  const cleanVehicle = vehicleInterest.replace(/"/g, '').trim() || 'the vehicle you\'re interested in';

  switch (objectionType) {
    case 'pricing_discrepancy':
    case 'online_vs_call_price':
      return `I completely understand your confusion about the pricing difference, ${leadName}. You're absolutely right to question that - nobody wants pricing surprises! 

The price you saw online for ${cleanVehicle} was likely the base MSRP, which doesn't include:
• Optional packages or upgrades
• Dealer-installed accessories  
• Documentation fees
• Taxes and licensing

I want to be 100% transparent with you. Can you tell me what specific features or packages were discussed when you called? That way I can explain exactly where that ${priceContext?.priceDifference || 'additional cost'} is coming from and see if there are alternatives that better fit your budget.`;

    case 'upgrade_costs':
      return `I hear your concern about the additional ${priceContext?.priceDifference || 'costs'} for upgrades on ${cleanVehicle}, ${leadName}. Those packages do add real value, but I want to make sure you're getting exactly what you need within your budget.

Let me break down what's included in those upgrades and their benefits. More importantly, what features are absolute must-haves for you versus nice-to-haves? We might have other trim levels or package combinations that give you what you want without the premium price.

What monthly payment range feels comfortable for you?`;

    case 'pricing_shock':
      return `I totally get that sticker shock, ${leadName} - it's never fun when the numbers are higher than expected for ${cleanVehicle}. Let's work together to find a solution that makes sense for your budget.

Rather than focus on the total price, what monthly payment would feel comfortable for you? We have financing options, and sometimes manufacturer incentives that can help. Plus, I want to make sure you're not paying for features you don't actually need.

What are the most important features for your next vehicle?`;

    case 'price_concern':
      return `Budget is definitely important, ${leadName}, and I want to find a way to make ${cleanVehicle} work for you. Let's focus on what monthly payment feels comfortable rather than the sticker price.

We have several financing options, and there might be incentives available that could help. Plus, if we're looking at a vehicle with packages you don't need, we can explore other options.

What payment range were you hoping for, and what features are most important to you?`;

    case 'financing_question':
      return `Great question about financing for ${cleanVehicle}, ${leadName}! We work with multiple lenders to find the best rates and terms for your situation.

A few quick questions to get you the most accurate information:
• What monthly payment range feels comfortable?
• Do you have a trade-in?
• What's your preferred down payment amount?

Once I know more about what works for your budget, I can show you exactly what your options look like.`;

    default:
      return `I want to make sure I address your pricing concerns about ${cleanVehicle}, ${leadName}. What specific questions do you have about the cost? I'm here to be completely transparent and help you find something that works within your budget.`;
  }
};

// Template for when we need to explain online vs dealer pricing
export const generatePricingTransparencyResponse = (vehicleInterest: string, leadName: string): string => {
  const cleanVehicle = vehicleInterest.replace(/"/g, '').trim() || 'our vehicles';
  
  return `I want to be completely upfront about pricing for ${cleanVehicle}, ${leadName}. Here's how our pricing works:

**Online Price = Base MSRP**
This is the manufacturer's suggested starting price without any options, packages, or fees.

**Final Price Includes:**
• Any packages or options you choose
• Dealer-installed accessories
• Documentation and processing fees  
• Taxes and licensing (varies by location)

I never want you to be surprised by pricing. Before we go any further, what monthly payment range feels comfortable for you? That way I can show you exactly what fits your budget and avoid any confusion.`;
};

// Template for addressing upgrade value concerns
export const generateUpgradeValueResponse = (vehicleInterest: string, leadName: string, upgradePrice?: string): string => {
  const cleanVehicle = vehicleInterest.replace(/"/g, '').trim();
  
  return `Let me explain what you get for that ${upgradePrice || 'additional cost'} on ${cleanVehicle}, ${leadName}:

The upgrade packages typically include multiple features that would cost much more if added individually. However, I understand you want to make sure you're getting good value.

Here's what I'd recommend:
1. Let me show you exactly what's included in each package
2. We'll identify which features are must-haves vs. nice-to-haves for you
3. I'll check if there are other trim levels that give you what you need at a better price point

What features are most important for your daily driving needs?`;
};
