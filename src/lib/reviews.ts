/**
 * Shared customer review quotes — surfaced on the /estimate page
 * and in the referral email template.
 */

export type Review = {
  quote: string;
  author: string;
  label?: string;
  stars?: number; // 1-5, defaults to 5
};

export const FEATURED_REVIEWS: Review[] = [
  {
    quote:
      "Had some leaks, they came out and found the problem. No need for new roof, just the venting needed replaced. Saved a lot of money. Crew was courteous and did a great job. Clean up was perfect. Honest and good company.",
    author: "Matthew O.",
    label: "Local Guide · Google Review",
  },
  {
    quote:
      "I received three bids for new siding and Taylor Exteriors is the way to go! The price was more than fair and the work is high quality. I have never been more pleased with a service.",
    author: "Scott E.",
    label: "Google Review",
  },
];
