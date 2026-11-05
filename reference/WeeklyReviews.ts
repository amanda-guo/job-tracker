import type { CollectionConfig } from 'payload'

export const WeeklyReviews: CollectionConfig = {
  slug: 'weekly-reviews',
  access: {
    create: () => true,
    delete: () => true,
    read: () => true,
    update: () => true,
  },
  admin: {
    useAsTitle: 'weekOf',
    defaultColumns: ['weekOf', 'conversations', 'applications', 'updatedAt'],
    group: 'Job search',
  },
  fields: [
    { name: 'weekOf', type: 'date', required: true, index: true },
    { name: 'conversations', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'outreach', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'referrals', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'applications', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'practice', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'events', type: 'number', required: true, min: 0, defaultValue: 0 },
    { name: 'hours', type: 'number', required: true, min: 0, max: 60, defaultValue: 0 },
    {
      name: 'health',
      type: 'select',
      required: true,
      defaultValue: 'steady',
      options: [
        { label: 'Running low', value: 'low' },
        { label: 'Steady', value: 'steady' },
        { label: 'Energized', value: 'energized' },
      ],
    },
    { name: 'win', type: 'textarea', maxLength: 500 },
    { name: 'nextFocus', type: 'textarea', maxLength: 500 },
    {
      name: 'targets',
      type: 'group',
      fields: [
        { name: 'conversations', type: 'number', min: 0, defaultValue: 5 },
        { name: 'outreach', type: 'number', min: 0, defaultValue: 18 },
        { name: 'referrals', type: 'number', min: 0, defaultValue: 2 },
        { name: 'applications', type: 'number', min: 0, defaultValue: 5 },
        { name: 'practice', type: 'number', min: 0, defaultValue: 2 },
        { name: 'events', type: 'number', min: 0, defaultValue: 1 },
      ],
    },
    { name: 'pivotNote', type: 'textarea', maxLength: 500 },
  ],
}
