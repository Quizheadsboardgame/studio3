# NC: Sales Tracker

This is the professional sales tracking and oversight vault for Newton's Collectables.

## Accessing the Vault

### For Staff
1. Open the application link on any device (phone, tablet, or PC).
2. The dashboard defaults to the **Staff Vault**.
3. Select a seller from the dropdown, enter the card details and price, and click **Log Sale**.
4. All entries are instantly synced to the master ledger.

### For Managers
1. Click the **Profile** button in the top right header.
2. Select **Manager Vault**.
3. Enter the master credential (**Harley**) to unlock management features.
4. Once authenticated, you can:
   - View detailed commission and payout run-downs.
   - Edit or delete any transaction log.
   - Provision or remove sellers and set their commission percentages.
   - Export the entire vault to CSV for accounting.

## Tech Stack
- **Framework**: NextJS 15 (App Router)
- **Database**: Firebase Cloud Firestore (Real-time Sync)
- **Auth**: Firebase Anonymous Auth (Encrypted Sessions)
- **Styling**: Tailwind CSS & ShadCN UI
