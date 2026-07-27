export interface LandingHowItWorksStep {
    title: string;
    description: string;
}

export interface LandingFaqItem {
    question: string;
    answer: string;
}

export interface LandingContentSections {
    PROBLEM_POINTS: string[];
    HOW_IT_WORKS: LandingHowItWorksStep[];
    TRUST_POINTS: string[];
    FAQ: LandingFaqItem[];
}

export type LandingSectionKey = keyof LandingContentSections;
