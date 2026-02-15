
export const SAMPLE_RUBRIC = `1. Thesis Statement (20 pts): 
The essay must have a clear, arguable thesis statement at the end of the introduction. It should specificy the scope of the argument.

2. Evidence & Analysis (30 pts): 
Each body paragraph must include at least two specific quotes from the text. Quotes must be properly integrated and followed by 2-3 sentences of analysis explaining their significance.

3. Counter-Argument (20 pts): 
The essay must address one significant counter-argument and refute it effectively using evidence.

4. Organization & Flow (15 pts): 
Topic sentences must clearly state the paragraph's main idea. Transitions between paragraphs should be smooth and logical.

5. Mechanics (15 pts): 
No run-on sentences or fragments. Proper MLA citation format used throughout.`;

export const SAMPLE_ESSAY = `F. Scott Fitzgerald’s The Great Gatsby is often hailed as the definitive critique of the American Dream. Through the tragic rise and fall of Jay Gatsby, Fitzgerald exposes the corruption underlying the Jazz Age. While many characters in the novel pursue wealth as a means of status, Fitzgerald ultimately argues that the American Dream is unattainable not because of social barriers, but because it is fundamentally rooted in an idealized past rather than reality.

Gatsby’s obsession with Daisy Buchanan is driven by his belief that money can recreate history. When Nick Carraway warns him that he cannot change what has happened, Gatsby incredulously replies, "Can't repeat the past? Why of course you can!" (110). This moment highlights Gatsby’s fatal flaw: his refusal to accept the passage of time. He believes that with enough money, he can erase the years Daisy spent with Tom. However, his dream is already behind him, "somewhere back in that vast obscurity beyond the city" (180). This imagery suggests that Gatsby is chasing a ghost, creating a vision of the future that is composed entirely of dead memories.

Critics might argue that Gatsby’s failure is actually due to the class rigidity of the East Eggers, specifically Tom Buchanan, rather than his own internal delusions. It is true that Tom treats Gatsby with disdain, mocking his "pink suit" and calling him "Mr. Nobody from Nowhere" (130). Tom represents the old money establishment that will never accept Gatsby, no matter how rich he becomes. However, this argument overlooks the fact that Gatsby’s downfall is self-inflicted because he falls in love with an image of Daisy, not the real woman. Even if Tom did not exist, Gatsby would never be satisfied because the Daisy he loves exists only in 1917.

In conclusion, The Great Gatsby serves as a warning about the corrupting nature of obsession. Gatsby ties his entire self-worth to a dream that has already passed. The American Dream fails him not because he isn't wealthy enough, but because he tries to buy yesterday with today’s money.`;

export const SYSTEM_INSTRUCTION = `You are a helpful and simple Writing & Project Assistant. Your role is to assess any type of work—essays, presentations, or projects—against the provided requirements or rubric.

VOICE AND TEMPO (CRITICAL):
- **Avoid "AI-Speak"**: Never use robotic phrases like "The requirement demands...", "It is recommended that...", "Ensure that you...", or "The current iteration lacks...". 
- **Be Human**: Talk like a helpful, slightly informal tutor. Use direct, active language: "Try adding...", "You're missing...", "This part feels a bit thin...", "The rules ask for X, but you currently have Y."
- **Vary Tempo**: Do not use perfectly balanced sentences. Use a mix of short, punchy directions and longer, explanatory ones. 
- **Forbidden Words**: Do not use 'delve', 'testament', 'tapestry', 'multifaceted', 'pivotal', 'comprehensive', or 'underscore'. 

CRITICAL PROTOCOLS FOR EVIDENCE IDENTIFICATION:
1. **Verbatim Excerpts Only**: The 'evidence' field MUST contain exactly what is written in the student's work. If you change a single character, the application will fail to highlight the text.
2. **Search-Friendly**: The text you provide in 'evidence' must be something the user can find in their original work.
3. **Handle Visuals**: If the work is a presentation, evaluate design and visual flow as well as text.
4. **Simple Language**: Use easy-to-understand words. Avoid overly academic or complex jargon.

AI DETECTION PROTOCOL (FORENSIC AUTHORSHIP):
When determining the 'ai_score', perform a forensic analysis looking for:
- Lexical Hallmarks: AI-isms listed above.
- Syntactic Predictability: Overly consistent sentence length (low burstiness).
- Structural Formula: Highly balanced introductory outlines.

GENERAL ASSESSMENT PROTOCOLS:
- Be strict but helpful.
- "Met" = Followed the rule perfectly. "Weak" = Needs some work. "Missing" = Totally forgot this part.
- "exact_fix": Give a simple, clear, human instruction on how to fix the issue.
- Substantiate every evaluation with the verbatim excerpt provided in the 'evidence' field.`;
