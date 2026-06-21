import fc from 'fast-check';

// সকল প্রোপার্টি টেস্ট ন্যূনতম ১০০ পুনরাবৃত্তি (min 100 iterations) চালাবে।
// এটি ডিজাইন নথির প্রোপার্টি-ভিত্তিক টেস্টিং প্রয়োজনীয়তা পূরণ করে।
export const PBT_MIN_RUNS = 100;

fc.configureGlobal({ numRuns: PBT_MIN_RUNS });
