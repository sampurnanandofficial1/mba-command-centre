type VerseWisdom = { reference:string; sanskrit:string; wisdom:string; practice:string };

const verseWisdom: VerseWisdom[] = [
  {reference:"2.14",sanskrit:"मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः। आगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥",wisdom:"Difficult conditions are temporary; meet them with steady endurance.",practice:"Stay composed through discomfort and continue the work that matters."},
  {reference:"2.38",sanskrit:"सुखदुःखे समे कृत्वा लाभालाभौ जयाजयौ। ततो युद्धाय युज्यस्व नैवं पापमवाप्स्यसि॥",wisdom:"Hold success and failure with equal steadiness, then fulfil your duty.",practice:"Judge the day by honest effort, not by applause or immediate results."},
  {reference:"2.40",sanskrit:"नेहाभिक्रमनाशोऽस्ति प्रत्यवायो न विद्यते। स्वल्पमप्यस्य धर्मस्य त्रायते महतो भयात्॥",wisdom:"No sincere effort on the path of Dharma is ever wasted.",practice:"Take one right step now; even modest disciplined progress protects momentum."},
  {reference:"2.47",sanskrit:"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥",wisdom:"Your authority is over action, never over the fruits of action.",practice:"Give full attention to the next necessary task and release anxiety about the outcome."},
  {reference:"2.48",sanskrit:"योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय। सिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥",wisdom:"Established in inner balance, perform your work without attachment.",practice:"Begin calmly, work completely, and remain balanced whatever the result."},
  {reference:"2.50",sanskrit:"बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते। तस्माद्योगाय युज्यस्व योगः कर्मसु कौशलम्॥",wisdom:"Yoga is excellence and discernment in action.",practice:"Do today’s work carefully, ethically, and with your highest available skill."},
  {reference:"2.64",sanskrit:"रागद्वेषवियुक्तैस्तु विषयानिन्द्रियैश्चरन्। आत्मवश्यैर्विधेयात्मा प्रसादमधिगच्छति॥",wisdom:"Freedom from attraction and aversion brings clarity and grace.",practice:"Do not let mood choose your priorities; let wisdom choose them."},
  {reference:"2.70",sanskrit:"आपूर्यमाणमचलप्रतिष्ठं समुद्रमापः प्रविशन्ति यद्वत्। तद्वत्कामा यं प्रविशन्ति सर्वे स शान्तिमाप्नोति न कामकामी॥",wisdom:"Peace belongs to one who remains steady while desires come and go.",practice:"Protect the plan from every passing impulse and distraction."},
  {reference:"3.8",sanskrit:"नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः। शरीरयात्रापि च ते न प्रसिद्ध्येदकर्मणः॥",wisdom:"Perform the work that is yours to do; action is better than inaction.",practice:"Start before motivation arrives and let movement create momentum."},
  {reference:"3.19",sanskrit:"तस्मादसक्तः सततं कार्यं कर्म समाचर। असक्तो ह्याचरन्कर्म परमाप्नोति पूरुषः॥",wisdom:"Without attachment, continually perform the duty that must be done.",practice:"Finish the important task because it is right, not because it is easy."},
  {reference:"3.21",sanskrit:"यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः। स यत्प्रमाणं कुरुते लोकस्तदनुवर्तते॥",wisdom:"The example set by a responsible person becomes a standard for others.",practice:"Work today in the manner you would want your team to imitate."},
  {reference:"3.30",sanskrit:"मयि सर्वाणि कर्माणि संन्यस्याध्यात्मचेतसा। निराशीर्निर्ममो भूत्वा युध्यस्व विगतज्वरः॥",wisdom:"Offer every action to the highest purpose and work without inner fever.",practice:"Dedicate the task to service, then execute it without needless agitation."},
  {reference:"3.35",sanskrit:"श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्। स्वधर्मे निधनं श्रेयः परधर्मो भयावहः॥",wisdom:"Imperfectly living your own Dharma is better than perfectly imitating another’s path.",practice:"Do your authentic responsibility instead of comparing your progress with others."},
  {reference:"4.18",sanskrit:"कर्मण्यकर्म यः पश्येदकर्मणि च कर्म यः। स बुद्धिमान्मनुष्येषु स युक्तः कृत्स्नकर्मकृत्॥",wisdom:"Wisdom sees stillness within action and meaningful action within stillness.",practice:"Act intensely without allowing haste to disturb the mind."},
  {reference:"4.33",sanskrit:"श्रेयान्द्रव्यमयाद्यज्ञाज्ज्ञानयज्ञः परन्तप। सर्वं कर्माखिलं पार्थ ज्ञाने परिसमाप्यते॥",wisdom:"The disciplined pursuit of knowledge is higher than material display.",practice:"Invest focused time in learning what will improve your decisions and service."},
  {reference:"4.38",sanskrit:"न हि ज्ञानेन सदृशं पवित्रमिह विद्यते। तत्स्वयं योगसंसिद्धः कालेनात्मनि विन्दति॥",wisdom:"Nothing purifies and clarifies like knowledge discovered through disciplined practice.",practice:"Study deeply, test your understanding, and convert learning into action."},
  {reference:"4.39",sanskrit:"श्रद्धावाँल्लभते ज्ञानं तत्परः संयतेन्द्रियः। ज्ञानं लब्ध्वा परां शान्तिमचिरेणाधिगच्छति॥",wisdom:"The dedicated, disciplined, and sincere seeker gains knowledge and peace.",practice:"Show up seriously for today’s learning even when progress feels slow."},
  {reference:"5.10",sanskrit:"ब्रह्मण्याधाय कर्माणि सङ्गं त्यक्त्वा करोति यः। लिप्यते न स पापेन पद्मपत्रमिवाम्भसा॥",wisdom:"One who acts without selfish attachment remains untouched by the strain of action.",practice:"Work wholeheartedly while refusing to carry unnecessary ego into the task."},
  {reference:"5.12",sanskrit:"युक्तः कर्मफलं त्यक्त्वा शान्तिमाप्नोति नैष्ठिकीम्। अयुक्तः कामकारेण फले सक्तो निबध्यते॥",wisdom:"Releasing attachment to results creates lasting peace.",practice:"Complete the process under your control and stop rehearsing uncertain outcomes."},
  {reference:"6.5",sanskrit:"उद्धरेदात्मनात्मानं नात्मानमवसादयेत्। आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥",wisdom:"Lift yourself through your own disciplined mind; do not become your own obstacle.",practice:"Use one deliberate choice today to become an ally to your future self."},
  {reference:"6.6",sanskrit:"बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जितः। अनात्मनस्तु शत्रुत्वे वर्तेतात्मैव शत्रुवत्॥",wisdom:"A mastered mind becomes a friend; an undisciplined mind behaves like an enemy.",practice:"Direct attention intentionally before distraction directs it for you."},
  {reference:"6.17",sanskrit:"युक्ताहारविहारस्य युक्तचेष्टस्य कर्मसु। युक्तस्वप्नावबोधस्य योगो भवति दुःखहा॥",wisdom:"Balanced food, recreation, work, sleep, and wakefulness support the end of sorrow.",practice:"Sustain high performance through rhythm and moderation, not exhaustion."},
  {reference:"6.26",sanskrit:"यतो यतो निश्चरति मनश्चञ्चलमस्थिरम्। ततस्ततो नियम्यैतदात्मन्येव वशं नयेत्॥",wisdom:"Whenever the restless mind wanders, patiently bring it back under purposeful direction.",practice:"Return to the task every time attention drifts—without anger or self-judgment."},
  {reference:"6.35",sanskrit:"असंशयं महाबाहो मनो दुर्निग्रहं चलम्। अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते॥",wisdom:"The restless mind is mastered through practice and detachment.",practice:"Repeat the right routine and release the demand to feel perfect while doing it."},
  {reference:"6.40",sanskrit:"पार्थ नैवेह नामुत्र विनाशस्तस्य विद्यते। न हि कल्याणकृत्कश्चिद् दुर्गतिं तात गच्छति॥",wisdom:"One who sincerely works for what is good never comes to ruin.",practice:"Trust that ethical effort compounds even when its rewards are not yet visible."},
];

const dailyResolves = [
  "Today, choose the highest-priority duty before the easiest task.",
  "Take the first clear step within the next five minutes.",
  "Give one uninterrupted focus block to work that serves your purpose.",
  "Complete what you begin before seeking another source of stimulation.",
  "Let discipline lead when enthusiasm is absent.",
  "Replace worry about the whole journey with attention to the present action.",
  "Protect your best hours for the responsibility with the greatest consequence.",
  "Make the next action small, specific, and impossible to misunderstand.",
  "Choose accuracy and integrity even when shortcuts look attractive.",
  "Respond to delay by recommitting, not by criticising yourself.",
  "Serve the larger purpose through the quality of this ordinary task.",
  "Close one unfinished loop that has been occupying your mind.",
  "Work quietly; let consistency become the evidence of your intention.",
  "Use every obstacle as a cue to become calmer and more deliberate.",
  "End the day able to say that duty—not impulse—governed your choices.",
];

export const quotes: string[][] = Array.from({length:365},(_,index)=>{
  const verse=verseWisdom[index%verseWisdom.length];
  const resolve=dailyResolves[Math.floor(index/verseWisdom.length)%dailyResolves.length];
  const day=String(index+1).padStart(3,"0");
  return [`${verse.sanskrit} · Bhagavad Gita ${verse.reference}`,`${verse.wisdom} ${resolve}`,`Day ${day}: ${verse.practice}`];
});
