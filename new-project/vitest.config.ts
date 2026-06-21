import { defineConfig } from 'vitest/config';

// প্রোপার্টি-ভিত্তিক টেস্টিং ফ্রেমওয়ার্ক কনফিগারেশন।
// fast-check-এর গ্লোবাল ডিফল্ট `test/setup.ts`-তে ন্যূনতম ১০০ পুনরাবৃত্তিতে সেট করা হয়।
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
