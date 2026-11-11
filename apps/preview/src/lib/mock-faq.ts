import type { FaqTopic } from '@kemo/ui'

// Static questions for the preview's FAQ page (`/faq`). Topic and question ids must be unique across
// the page: they become the anchors `#topic-{id}` and `#q-{id}`.

export const faqTopics: FaqTopic[] = [
  {
    id: 'deployments',
    label: 'Deployments',
    questions: [
      {
        id: 'rollback',
        question: 'How do I roll back a deployment?',
        answer:
          'Open the deployment, choose "Roll back" and confirm. The previous version is restored within a minute and the event appears in the stream.',
      },
      {
        id: 'canary-stuck',
        question: 'Why is my canary stuck at 10%?',
        answer:
          "A canary holds until its error rate stays below the threshold for the configured window. Check the service's health signals; the rollout continues on its own once they recover.",
      },
      {
        id: 'multi-env',
        question: 'Can I deploy to more than one environment at once?',
        answer: 'Not today. Promote through environments in order so each gate runs.',
      },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts and access',
    questions: [
      {
        id: 'invite',
        question: 'How do I invite a teammate?',
        answer:
          'Go to Access, choose "Invite" and enter their work email. The invite expires after seven days.',
      },
      {
        id: 'viewer-role',
        question: 'What does the Viewer role allow?',
        answer:
          "Viewers can see services, deployments and dashboards, but can't deploy, roll back or change settings.",
      },
      {
        id: 'sso',
        question: 'Can we sign in with our identity provider?',
        answer:
          'Yes. An admin can connect a SAML or OIDC provider under Settings, then require it for everyone in the workspace.',
      },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    questions: [
      {
        id: 'billing-email',
        question: 'How do I change the billing email?',
        answer:
          'Open Settings, then Billing, and edit the contact email. Invoices from the next cycle go to the new address.',
      },
      {
        id: 'invoice',
        question: 'Where can I download past invoices?',
        answer:
          'Settings, then Billing, lists every invoice from the last 24 months. Each one downloads as a PDF.',
      },
      {
        id: 'plan-change',
        question: 'What happens when I change plans mid-cycle?',
        answer:
          'Upgrades take effect immediately and the difference is prorated on the next invoice. Downgrades apply at the end of the current cycle.',
      },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    questions: [
      {
        id: 'audit-log',
        question: 'Is there an audit log?',
        answer:
          'Yes. Settings, then Audit log, records sign-ins, permission changes and deployments for 90 days. Admins can export it as CSV.',
      },
      {
        id: 'api-keys',
        question: 'How do I rotate an API key?',
        answer:
          'Create a new key under Access, update your clients, then revoke the old key. Revoked keys stop working immediately.',
      },
      {
        id: 'data-residency',
        question: 'Where is our data stored?',
        answer:
          "In the region you chose when the workspace was created. It isn't copied to other regions.",
      },
    ],
  },
]
