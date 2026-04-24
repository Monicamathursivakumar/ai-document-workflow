import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "../context/TranslationContext";

// 1. Animated Counter Component
const AnimatedNumber = ({ value, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsStarted(true);
    }, { threshold: 0.1 });
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isStarted) return;
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }, [isStarted, value, duration]);

  return <span ref={elementRef}>{count.toLocaleString()}{suffix}</span>;
};

const sectionStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const sectionReveal = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const MotionReveal = ({ children, delay = 0 }) => (
  <motion.div
    variants={sectionReveal}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.15 }}
    transition={{ delay }}
  >
    {children}
  </motion.div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const challengesRef = useRef(null);
  const { currentLanguage } = useTranslation();

  const landingContent = {
    en: {
      heroTitleLine1: "Transforming Document",
      heroTitleAccent: "Operations with AI",
      heroDescription:
        "IntelliDocX automates document flows, ensuring high-speed compliance and coordination across internal departments.",
      launchDashboard: "Launch Dashboard",
      overview: "Overview",
      latencyReduction: "Latency Reduction",
      latencyDescription: "Real-time processing speed.",
      documentsDaily: "Documents Daily",
      documentsDescription: "Daily automated ingestion.",
      complianceMonitoring: "Compliance Monitoring",
      complianceDescription: "Automated regulatory oversight.",
      operationalContext: "Operational Context",
      operationalStatementPrefix: "Moving from",
      operationalStatementBold1: "static record handling",
      operationalStatementMiddle: "to",
      operationalStatementBold2: "decision enablement",
      challengeTitle: "The Challenge",
      challengeBody:
        '"Personnel allocate time to locating and interpreting information before action can begin."',
      challengeFootnote: "Operational Efficiency",
      synthesisTitle: "The Synthesis",
      synthesisBody:
        "Engineering modifications, procurement activity, and maintenance advisories are synchronized into a single operational signal.",
      resultTitle: "The Result",
      resultBody:
        "Organisational memory increases without sacrificing accessibility. Knowledge reaches stakeholders already understood.",
      intelligenceRoutingTitle: "Intelligence routing",
      intelligenceRoutingAccent: "by responsibility.",
      intelligenceRoutingBody:
        "Applying text extraction and contextual classification to ensure relevance while maintaining accountability and audit continuity.",
      capabilityLabel: "Capability",
      cap1Title: "Automated Comprehension",
      cap1Body: "Identifying intent and urgency in incoming records.",
      cap2Title: "Departmental Precision",
      cap2Body: "Contextual meaning aligned with specific unit responsibilities.",
      cap3Title: "Multilingual Standard",
      cap3Body:
        "Reliable summaries produced in English, Hindi, Malayalam, and Tamil.",
      finalStatement:
        '"The objective is not to reduce documentation but to restore its operational value."',
      finalStatementAccent: "restore its operational value",
      enterPortal: "Enter Intelligence Portal",
      footerReliability: "Reliability",
      footerTransparency: "Transparency",
      footerGovernance: "Governance",
      languageLabel: "Language",
    },
    hi: {
      heroTitleLine1: "दस्तावेज़ संचालन को",
      heroTitleAccent: "AI के साथ रूपांतरित करें",
      heroDescription:
        "IntelliDocX दस्तावेज़ प्रवाह को स्वचालित करता है, जिससे विभागों में तेज़ अनुपालन और समन्वय सुनिश्चित होता है।",
      launchDashboard: "डैशबोर्ड खोलें",
      overview: "अवलोकन",
      latencyReduction: "विलंबता में कमी",
      latencyDescription: "रीयल-टाइम प्रोसेसिंग गति।",
      documentsDaily: "दैनिक दस्तावेज़",
      documentsDescription: "दैनिक स्वचालित इनजेशन।",
      complianceMonitoring: "अनुपालन निगरानी",
      complianceDescription: "स्वचालित नियामकीय निगरानी।",
      operationalContext: "संचालन संदर्भ",
      operationalStatementPrefix: "हम बढ़ रहे हैं",
      operationalStatementBold1: "स्थिर रिकॉर्ड प्रबंधन",
      operationalStatementMiddle: "से",
      operationalStatementBold2: "निर्णय-सक्षम प्रणाली",
      challengeTitle: "चुनौती",
      challengeBody:
        '"कार्रवाई शुरू करने से पहले कर्मचारियों का समय जानकारी खोजने और समझने में खर्च होता है।"',
      challengeFootnote: "संचालन दक्षता",
      synthesisTitle: "समेकन",
      synthesisBody:
        "इंजीनियरिंग, खरीद और रखरखाव सलाह को एकीकृत संचालन संकेत में समन्वित किया जाता है।",
      resultTitle: "परिणाम",
      resultBody:
        "संगठनात्मक स्मृति बढ़ती है और पहुँच सरल रहती है। ज्ञान हितधारकों तक स्पष्ट रूप में पहुँचता है।",
      intelligenceRoutingTitle: "जिम्मेदारी के अनुसार",
      intelligenceRoutingAccent: "बुद्धिमान रूटिंग",
      intelligenceRoutingBody:
        "प्रासंगिकता सुनिश्चित करने के लिए टेक्स्ट एक्सट्रैक्शन और संदर्भ आधारित वर्गीकरण का उपयोग, साथ में जवाबदेही और ऑडिट निरंतरता।",
      capabilityLabel: "क्षमता",
      cap1Title: "स्वचालित समझ",
      cap1Body: "आने वाले रिकॉर्ड में आशय और तात्कालिकता की पहचान।",
      cap2Title: "विभागीय सटीकता",
      cap2Body: "विशिष्ट इकाई जिम्मेदारियों के अनुरूप संदर्भित अर्थ।",
      cap3Title: "बहुभाषी मानक",
      cap3Body:
        "अंग्रेज़ी, हिंदी, मलयालम और तमिल में विश्वसनीय सारांश।",
      finalStatement:
        '"लक्ष्य दस्तावेज़ कम करना नहीं, बल्कि उनके संचालन मूल्य को पुनर्स्थापित करना है।"',
      finalStatementAccent: "संचालन मूल्य को पुनर्स्थापित करना",
      enterPortal: "इंटेलिजेंस पोर्टल में जाएँ",
      footerReliability: "विश्वसनीयता",
      footerTransparency: "पारदर्शिता",
      footerGovernance: "शासन",
      languageLabel: "भाषा",
    },
    ml: {
      heroTitleLine1: "ഡോക്യുമെന്റ് പ്രവർത്തനങ്ങളെ",
      heroTitleAccent: "AI ഉപയോഗിച്ച് മാറ്റം വരുത്തുക",
      heroDescription:
        "IntelliDocX ഡോക്യുമെന്റ് പ്രവാഹം ഓട്ടോമേറ്റ് ചെയ്ത് വകുപ്പുകളിലുടനീളം വേഗത്തിലുള്ള അനുസരണയും ഏകോപനവും ഉറപ്പാക്കുന്നു.",
      launchDashboard: "ഡാഷ്ബോർഡ് തുറക്കുക",
      overview: "അവലോകനം",
      latencyReduction: "വിലംബ കുറവ്",
      latencyDescription: "തത്സമയ പ്രോസസ്സിംഗ് വേഗം.",
      documentsDaily: "ദൈനംദിന ഡോക്യുമെന്റുകൾ",
      documentsDescription: "ദൈനംദിന ഓട്ടോമേറ്റഡ് ഇൻജെഷൻ.",
      complianceMonitoring: "അനുസരണ നിരീക്ഷണം",
      complianceDescription: "ഓട്ടോമേറ്റഡ് നിയന്ത്രണ മേൽനോട്ടം.",
      operationalContext: "ഓപ്പറേഷൻൽ കോൺടെക്സ്റ്റ്",
      operationalStatementPrefix: "നാം മാറുന്നത്",
      operationalStatementBold1: "സ്ഥിര രേഖ കൈകാര്യം",
      operationalStatementMiddle: "നിന്ന്",
      operationalStatementBold2: "തീരുമാന-സജ്ജമായ സംവിധാനത്തിലേക്ക്",
      challengeTitle: "പ്രതിസന്ധി",
      challengeBody:
        '"നടപടി തുടങ്ങുന്നതിന് മുൻപ് ജീവനക്കാർ വിവരങ്ങൾ കണ്ടെത്താനും മനസ്സിലാക്കാനും സമയം ചെലവഴിക്കുന്നു."',
      challengeFootnote: "ഓപ്പറേഷൻൽ കാര്യക്ഷമത",
      synthesisTitle: "സമന്വയം",
      synthesisBody:
        "എഞ്ചിനിയറിംഗ് മാറ്റങ്ങൾ, പ്രോക്യുറ്മെന്റ് പ്രവർത്തനങ്ങൾ, മെയിന്റനൻസ് നിർദേശങ്ങൾ എന്നിവ ഒറ്റ പ്രവർത്തന സിഗ്നലായി ഏകീകരിക്കുന്നു.",
      resultTitle: "ഫലം",
      resultBody:
        "പ്രവേശന സൗകര്യം നഷ്ടമാക്കാതെ സംഘടനാ ഓർമ്മ വർധിക്കുന്നു. അറിവ് വ്യക്തമായി ഉത്തരവാദിത്തപ്പെട്ടവരിലേക്ക് എത്തുന്നു.",
      intelligenceRoutingTitle: "ഉത്തരവാദിത്തപ്രകാരം",
      intelligenceRoutingAccent: "ബുദ്ധിയുള്ള റൂട്ടിംഗ്",
      intelligenceRoutingBody:
        "പ്രസക്തി ഉറപ്പാക്കാൻ ടെക്സ്റ്റ് എക്സ്ട്രാക്ഷനും കോൺടെക്സ്റ്റ് ക്ലാസിഫിക്കേഷനും ഉപയോഗിച്ച് ഉത്തരവാദിത്തവും ഓഡിറ്റ് തുടർച്ചയും നിലനിർത്തുന്നു.",
      capabilityLabel: "ശേഷി",
      cap1Title: "ഓട്ടോമേറ്റഡ് ബോധ്യം",
      cap1Body: "വരുന്ന രേഖകളിലെ ഉദ്ദേശ്യവും അടിയന്തിരതയും കണ്ടെത്തൽ.",
      cap2Title: "വകുപ്പ് കൃത്യത",
      cap2Body: "വിശിഷ്ട യൂണിറ്റ് ഉത്തരവാദിത്തങ്ങൾക്ക് ചേർന്ന കോൺടെക്സ്റ്റ് അർത്ഥം.",
      cap3Title: "ബഹുഭാഷാ നിലവാരം",
      cap3Body:
        "ഇംഗ്ലീഷ്, ഹിന്ദി, മലയാളം, തമിഴ് ഭാഷകളിൽ വിശ്വാസ്യതയുള്ള സംഗ്രഹങ്ങൾ.",
      finalStatement:
        '"രേഖകൾ കുറയ്ക്കുക അല്ല ലക്ഷ്യം, അവയുടെ പ്രവർത്തന മൂല്യം പുനസ്ഥാപിക്കുകയാണ്."',
      finalStatementAccent: "പ്രവർത്തന മൂല്യം പുനസ്ഥാപിക്കുകയാണ്",
      enterPortal: "ഇന്റലിജൻസ് പോർട്ടലിലേക്ക് പ്രവേശിക്കുക",
      footerReliability: "വിശ്വാസ്യത",
      footerTransparency: "പാരദർശിത്വം",
      footerGovernance: "ഭരണം",
      languageLabel: "ഭാഷ",
    },
    ta: {
      heroTitleLine1: "ஆவண செயல்பாடுகளை",
      heroTitleAccent: "AI மூலம் மாற்றுங்கள்",
      heroDescription:
        "IntelliDocX ஆவண ஓட்டங்களை தானியங்காக்கி, துறைகள் முழுவதும் வேகமான இணக்கத்தன்மை மற்றும் ஒருங்கிணைப்பை உறுதி செய்கிறது.",
      launchDashboard: "டாஷ்போர்டைத் திறக்கவும்",
      overview: "மேலோட்டம்",
      latencyReduction: "தாமத குறைப்பு",
      latencyDescription: "நேரடி செயலாக்க வேகம்.",
      documentsDaily: "தினசரி ஆவணங்கள்",
      documentsDescription: "தினசரி தானியங்கி உட்செருகல்.",
      complianceMonitoring: "இணக்க கண்காணிப்பு",
      complianceDescription: "தானியங்கி ஒழுங்குமுறை கண்காணிப்பு.",
      operationalContext: "செயற்பாட்டு சூழல்",
      operationalStatementPrefix: "நாம் நகர்வது",
      operationalStatementBold1: "நிலையான பதிவுக் கையாளுதல்",
      operationalStatementMiddle: "இருந்து",
      operationalStatementBold2: "முடிவு-இயக்கும் செயல்முறைக்கு",
      challengeTitle: "சவால்",
      challengeBody:
        '"நடவடிக்கை தொடங்குவதற்கு முன் பணியாளர்கள் தகவலைத் தேடி புரிந்துகொள்ள நேரம் செலவிடுகின்றனர்."',
      challengeFootnote: "செயற்பாட்டு திறன்",
      synthesisTitle: "ஒருங்கிணைவு",
      synthesisBody:
        "பொறியியல் மாற்றங்கள், கொள்முதல் செயல்பாடுகள் மற்றும் பராமரிப்பு அறிவுறுத்தல்கள் அனைத்தும் ஒரே செயல்பாட்டு சிக்னலாக இணைக்கப்படுகின்றன.",
      resultTitle: "விளைவு",
      resultBody:
        "அணுகலை இழக்காமல் நிறுவன நினைவகம் அதிகரிக்கிறது. அறிவு தெளிவாக பங்குதாரர்களை அடைகிறது.",
      intelligenceRoutingTitle: "பொறுப்பின் அடிப்படையில்",
      intelligenceRoutingAccent: "நுண்ணறிவு வழிமாற்று",
      intelligenceRoutingBody:
        "பொருத்தத்தன்மையை உறுதி செய்ய உரை பிரித்தெடுப்பு மற்றும் சூழல் வகைப்பாட்டைப் பயன்படுத்தி, பொறுப்புணர்வும் ஆய்வு தொடர்ச்சியும் பாதுகாக்கப்படுகிறது.",
      capabilityLabel: "திறன்",
      cap1Title: "தானியங்கி புரிதல்",
      cap1Body: "வரும் பதிவுகளில் நோக்கம் மற்றும் அவசரத்தன்மையை கண்டறிதல்.",
      cap2Title: "துறை துல்லியம்",
      cap2Body: "குறிப்பிட்ட அலகு பொறுப்புகளுடன் பொருந்தும் சூழலார்ந்த அர்த்தம்.",
      cap3Title: "பல்மொழி தரநிலை",
      cap3Body:
        "ஆங்கிலம், இந்தி, மலையாளம், தமிழ் மொழிகளில் நம்பகமான சுருக்கங்கள்.",
      finalStatement:
        '"இலக்கு ஆவணங்களை குறைப்பது அல்ல; அவற்றின் செயற்பாட்டு மதிப்பை மீட்டெடுப்பதே."',
      finalStatementAccent: "செயற்பாட்டு மதிப்பை மீட்டெடுப்பதே",
      enterPortal: "இன்டெலிஜென்ஸ் போர்டலுக்கு நுழைக",
      footerReliability: "நம்பகத்தன்மை",
      footerTransparency: "வெளிப்படைத்தன்மை",
      footerGovernance: "ஆளுமை",
      languageLabel: "மொழி",
    },
  };

  const content = landingContent[currentLanguage] || landingContent.en;

  const handleDashboardClick = () => navigate("/login");
  const scrollToOverview = () => challengesRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">

      {/* HERO SECTION - ADDED BACKGROUND IMAGE */}
      <section className="relative pt-28 pb-24 border-b border-[#e0f2f3] overflow-hidden">
        <motion.div
          className="pointer-events-none absolute -left-20 top-28 z-0 h-72 w-72 rounded-full bg-[#00909a]/20 blur-3xl"
          animate={{ y: [0, -20, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute right-10 top-20 z-0 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl"
          animate={{ y: [0, 28, 0], x: [0, -16, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2200&q=80"
            alt="AI-assisted document operations background"
            className="w-full h-full object-cover"
          />
          {/* Subtle readability overlays */}
          <div className="absolute inset-0 bg-slate-900/35"></div>
          <div className="absolute inset-0 bg-linear-to-r from-[#f4fafb] via-[#f4fafb]/92 to-transparent"></div>
        </div>

        <motion.div
          className="relative z-10 mx-auto max-w-6xl px-6"
          variants={sectionStagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <div className="text-left mb-12">
            <motion.h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight tracking-tighter text-slate-900" variants={sectionReveal}>
              {content.heroTitleLine1}<br/>
              <span className="text-[#00909a]">{content.heroTitleAccent}</span>
            </motion.h1>
            <motion.p className="text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed" variants={sectionReveal}>
              {content.heroDescription}
            </motion.p>

            <motion.div className="flex flex-wrap gap-4 mb-16" variants={sectionReveal}>
              <motion.button
                onClick={handleDashboardClick}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="bg-[#00909a] text-white px-8 py-4 font-bold text-sm hover:bg-[#007a82] transition shadow-md uppercase tracking-widest"
              >
                {content.launchDashboard}
              </motion.button>
              <motion.button
                onClick={scrollToOverview}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white/80 backdrop-blur-sm text-[#00909a] border-2 border-[#00909a] px-8 py-4 font-bold text-sm hover:bg-[#e6f4f5] transition uppercase tracking-widest"
              >
                {content.overview}
              </motion.button>
            </motion.div>

            {/* LIVE METRICS BOXES */}
            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={sectionStagger}>
              <motion.div className="bg-white/90 backdrop-blur-md p-8 border-l-4 border-[#00909a] shadow-sm ring-1 ring-black/5" variants={sectionReveal} whileHover={{ y: -8, rotateX: 2 }} style={{ transformPerspective: 900 }}>
                <p className="text-5xl font-black text-[#00909a]">
                  <AnimatedNumber value={95} suffix="%" />
                </p>
                <p className="text-slate-800 text-xs uppercase font-black tracking-widest mt-2">{content.latencyReduction}</p>
                <p className="text-slate-500 text-sm mt-2 font-medium">{content.latencyDescription}</p>
              </motion.div>
              
              <motion.div className="bg-white/90 backdrop-blur-md p-8 border-l-4 border-[#00909a] shadow-sm ring-1 ring-black/5" variants={sectionReveal} whileHover={{ y: -8, rotateX: 2 }} style={{ transformPerspective: 900 }}>
                <p className="text-5xl font-black text-[#00909a]">
                  <AnimatedNumber value={1000} suffix="+" />
                </p>
                <p className="text-slate-800 text-xs uppercase font-black tracking-widest mt-2">{content.documentsDaily}</p>
                <p className="text-slate-500 text-sm mt-2 font-medium">{content.documentsDescription}</p>
              </motion.div>

              <motion.div className="bg-white/90 backdrop-blur-md p-8 border-l-4 border-[#16a34a] shadow-sm ring-1 ring-black/5" variants={sectionReveal} whileHover={{ y: -8, rotateX: 2 }} style={{ transformPerspective: 900 }}>
                <p className="text-5xl font-black text-[#16a34a]">24/7</p>
                <p className="text-slate-800 text-xs uppercase font-black tracking-widest mt-2">{content.complianceMonitoring}</p>
                <p className="text-slate-500 text-sm mt-2 font-medium">{content.complianceDescription}</p>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* CARDS SECTION (KEEPING YOUR RECENT PREFERENCE) */}
      <section ref={challengesRef} className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <MotionReveal>
            <div className="text-center mb-16">
              <h2 className="text-[#00909a] text-xs font-black uppercase tracking-[0.4em] mb-4">{content.operationalContext}</h2>
              <p className="text-4xl font-light text-slate-900 max-w-3xl mx-auto leading-tight">
                {content.operationalStatementPrefix} <span className="font-bold">{content.operationalStatementBold1}</span> {content.operationalStatementMiddle} <span className="font-bold underline decoration-[#00909a]/20 decoration-4">{content.operationalStatementBold2}</span>.
              </p>
            </div>
          </MotionReveal>

          <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" variants={sectionStagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            <MotionReveal>
              <motion.div className="p-10 bg-[#f4fafb] rounded-2xl h-full border border-transparent transition-all duration-500" whileHover={{ y: -10, rotate: -0.5 }}>
                <div className="w-12 h-12 bg-[#00909a] text-white rounded-lg flex items-center justify-center mb-8 shadow-lg font-bold text-lg">01</div>
                <h4 className="text-xl font-bold mb-4 text-slate-800">{content.challengeTitle}</h4>
                <p className="text-slate-600 text-sm leading-relaxed italic">{content.challengeBody}</p>
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-[10px] text-[#00909a] leading-relaxed uppercase font-black tracking-widest">{content.challengeFootnote}</p>
                </div>
              </motion.div>
            </MotionReveal>

            <MotionReveal delay={0.05}>
              <motion.div className="p-10 bg-white rounded-2xl h-full border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group" whileHover={{ y: -10, rotate: 0.4 }}>
                <div className="w-12 h-12 bg-slate-100 group-hover:bg-[#00909a] group-hover:text-white rounded-lg flex items-center justify-center mb-8 transition-colors font-bold text-lg">02</div>
                <h4 className="text-xl font-bold mb-4 text-slate-800">{content.synthesisTitle}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{content.synthesisBody}</p>
              </motion.div>
            </MotionReveal>

            <MotionReveal delay={0.1}>
              <motion.div className="p-10 bg-white rounded-2xl h-full border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group" whileHover={{ y: -10, rotate: -0.4 }}>
                <div className="w-12 h-12 bg-slate-100 group-hover:bg-[#00909a] group-hover:text-white rounded-lg flex items-center justify-center mb-8 transition-colors font-bold text-lg">03</div>
                <h4 className="text-xl font-bold mb-4 text-slate-800">{content.resultTitle}</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{content.resultBody}</p>
              </motion.div>
            </MotionReveal>
          </motion.div>
        </div>
      </section>

      {/* PLATFORM CAPABILITY */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <MotionReveal>
              <h3 className="text-5xl font-black tracking-tighter leading-tight">
                {content.intelligenceRoutingTitle} <br/> 
                <span className="text-[#00909a]">{content.intelligenceRoutingAccent}</span>
              </h3>
              <p className="mt-8 text-slate-400 text-lg font-light leading-relaxed">
                {content.intelligenceRoutingBody}
              </p>
            </MotionReveal>
            
            <div className="space-y-4">
              {[
                { t: content.cap1Title, d: content.cap1Body },
                { t: content.cap2Title, d: content.cap2Body },
                { t: content.cap3Title, d: content.cap3Body }
              ].map((item, i) => (
                <MotionReveal key={i} delay={i * 0.05}>
                  <motion.div className="p-6 border border-white/10 hover:border-[#00909a]/50 bg-white/5 transition-all cursor-default" whileHover={{ x: 6 }}>
                    <p className="text-[#00909a] font-bold text-xs uppercase tracking-[0.2em] mb-2">{content.capabilityLabel} 0{i+1}</p>
                    <p className="text-lg font-bold mb-1">{item.t}</p>
                    <p className="text-sm text-slate-500">{item.d}</p>
                  </motion.div>
                </MotionReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FINAL STATEMENT */}
      <section className="py-24 bg-white text-center">
        <MotionReveal>
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-serif italic text-slate-800 mb-10 leading-relaxed">
              {content.finalStatement}
            </h2>
            <motion.button
              onClick={handleDashboardClick}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="bg-[#00909a] text-white px-12 py-5 font-black text-xs uppercase tracking-[0.3em] hover:bg-[#007a82] transition-all shadow-xl"
            >
              {content.enterPortal}
            </motion.button>
          </div>
        </MotionReveal>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-50 text-slate-400 py-12 px-6 border-t border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-xs font-bold uppercase tracking-widest">© 2026 IntelliDocX</p>
          <div className="flex space-x-8 text-[10px] font-black uppercase tracking-[0.3em] mt-6 md:mt-0">
            <span>{content.footerReliability}</span>
            <span>{content.footerTransparency}</span>
            <span>{content.footerGovernance}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

