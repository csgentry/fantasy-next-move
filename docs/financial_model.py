from pathlib import Path
# Planning assumptions, not provider quotes or measured customer behavior.
monthly=7.99
annual=39.99
annual_share=.7
payment_pct=.029
billing_pct=.007
payment_fixed=.30
fixed={'Vercel':20,'Supabase':25,'Google Workspace':9,'Domain monthly allocation':2,'Resend':0,'Analytics/monitoring':10,'Data minimum':50}
lines=['# Financial model — planning scenarios only','', 'Proposed Pro: $7.99 monthly / $39.99 annually. Preserve current price IDs until corresponding test prices are verified. No live billing authorized. Actual revenue, invoices, expenses, paid demand and subscriber counts are unknown; observed zero subscription rows are not a full accounting audit.','', 'Assumptions: 70% annual subscribers, 30% monthly; 2.9% + $0.30 per transaction plus 0.7% billing allowance; these are editable planning inputs, not verified account-specific Stripe fees. Annual fees normalized over 12 months. Variable data $0.25 and support $0.50 per subscriber monthly. Replacement acquisition assumes 3% monthly churn and $20 CAC ($0.60/subscriber/month). Refund reserve 2% revenue. Initial acquisition expenditure $20 per subscriber is shown separately and excluded from recurring contribution. No owner salary, taxes, disputes, international fees or licensed-data contract minimums included.','', '| Cost | Monthly planning allowance |','|---|---:|']
for k,v in fixed.items():lines.append(f'| {k} | ${v:,.2f} |')
lines+=['','LLC formation/EIN/legal/bank setup: actual costs unverified; excluded from operating table, reserve $1,000 as a planning contingency only. Google Workspace/domain annual renewals and all actual bills must be reconciled. Paid acquisition assumptions are unproven and may be substantially worse.','', '| Subscribers | MRR equivalent | ARR equivalent | Payment + billing fees/mo | Infrastructure/data/mo | Support/mo | Replacement ads/mo | Refund reserve/mo | Operating contribution/mo | Initial acquisition |','|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
for n in [25,100,250,500,1000,2500,5000]:
 rev=n*(annual_share*annual/12+(1-annual_share)*monthly)
 fees=rev*(payment_pct+billing_pct)+n*(annual_share/12+1-annual_share)*payment_fixed
 infra=sum(fixed.values())+.25*n
 support=.5*n
 ads=.6*n
 refunds=.02*rev
 contribution=rev-fees-infra-support-ads-refunds
 vals=[n,rev,rev*12,fees,infra,support,ads,refunds,contribution,20*n]
 lines.append('| '+str(n)+' | '+' | '.join(f'${v:,.2f}' for v in vals[1:])+' |')
lines+=['','MRR equivalent = annual subscribers × annual price / 12 + monthly subscribers × monthly price. ARR equivalent = 12 × normalized MRR, not cash collected or recognized accounting revenue. Operating contribution = revenue − payment/billing fees − infrastructure/data − support − replacement ads − refunds. Net recurring revenue after refunds = revenue × 0.98. Contribution margin = operating contribution / revenue.','', 'Sensitivity: each extra $1 in monthly data/support/CAC allocation reduces contribution by the subscriber count in dollars. Each additional 1 percentage point monthly churn at assumed $20 CAC adds $0.20/subscriber/month in replacement acquisition. Fantasy football demand is seasonal; steady-state churn assumptions can understate off-season cancellations. No model scenario establishes profitability.']
Path(__file__).with_name('FINANCIAL-MODEL.md').write_text('\n'.join(lines)+'\n')
