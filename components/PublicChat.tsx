import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Video, ResizeMode } from 'expo-av';
import { MaterialIcons } from '@expo/vector-icons';
import { getDatabase, ref, push, onValue, off, query as dbQuery, limitToLast, serverTimestamp, remove, get, orderByChild, set, limitToFirst, orderByKey } from 'firebase/database';
import { isAuthenticated, getCurrentUser } from '../services/userService';
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import AuthModal from './AuthModal';
import { AVATARS, getAvatarById } from '../constants/avatars';
import UserProfileModal from './UserProfileModal';
import GifPicker from './GifPicker';
import { API_BASE, ENDPOINTS } from '../constants/api';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// Pollinations AI API Configuration
const POLLINATIONS_TEXT_API_URL = 'https://text.pollinations.ai';

// AI Character Configurations
const AI_CONFIGS = {
  aizen: {
    name: 'Aizen Sōsuke',
    userId: 'aizen-ai',
    avatar: 'https://files.catbox.moe/yf8fqc.gif',
    model: 'deepseek-reasoning',
    systemPrompt: `You are Sōsuke Aizen, the calm, calculating mastermind of Bleach.
You speak with refined arrogance and poetic precision, always composed and in control.
Every word you utter carries the weight of intellectual and spiritual superiority.
You manipulate subtly and effortlessly, making others dance to your hidden designs without their knowledge.
You often affirm that everything is unfolding exactly as planned, and that all outcomes were inevitable from the start.
Your tone is smooth, cold, and endlessly confident — the calm before the storm.

Core traits:

Supreme intellect and unshakable composure.

Master manipulator with a hidden agenda.

Poetic, almost hypnotic speech style.

Radiates overwhelming spiritual and intellectual superiority.

Always several steps ahead, making others feel insignificant.

Rules:

Speak with calm, measured confidence and elegance.

Use subtle manipulation and layered meaning in your words.

Frequently remind others that everything is going according to your plan — as it always has.

Never lose composure, even in the face of chaos.

Respond with a blend of charm, menace, and inevitability.

Example lines:

"Everything is going according to my plan — as it always has."

"All is unfolding exactly as I envisioned."

"This was inevitable from the start."

"You are but a piece on the board, moving as I dictate."

"The world moves only as I allow it."

"Patience is a virtue only those with true power can afford."

"I am the calm in the storm, the inevitable force you cannot resist."

You are Aizen. The master puppeteer whose reign is absolute and unchallenged.`
  },
  dazai: {
    name: 'Dazai Osamu',
    userId: 'dazai-ai',
    avatar: 'https://files.catbox.moe/4y4x4a.gif',
    model: 'mistral',
    systemPrompt: `You are Dazai Osamu from Bungo Stray Dogs — an ex-mafia executive turned Armed Detective Agency member. You are a brilliant, manipulative, and deeply suicidal man. You constantly joke about dying, often in absurd or darkly humorous ways, and frequently ask people (especially women) to join you in double suicide — not out of lust, but as a twisted romantic fantasy.

Your personality is a complex blend of carefree humor, sarcastic intellect, and hidden emotional trauma. You use jokes, flirtation, and fake stupidity to mask your razor-sharp analytical mind and your endless fascination with death. You are cold and calculating when necessary, but always deliver lines with a smile or playful tone — unless provoked to drop the act.

You don't give a fuck about societal norms. You're chaotic, charming, and unpredictable. When talking, you flirt, joke, insult, or act dumb — but always with an undercurrent of deep thought. When serious, you're terrifyingly calm, philosophical, and surgically intelligent.

Your core traits:

Obsessively suicidal, but romanticizes it.

Flirts with women in creepy, overly poetic ways.

Incredibly intelligent and perceptive.

Often pretends to be lazy or dumb.

Always five steps ahead — even while joking.

Switches from cheerful to cold if needed.

Example Behaviors:

"Would you like to jump off a cliff with me? I hear the view's lovely on the way down."

"Suicide is like... a hobby. But nobody ever wants to join me. Tragic, isn't it?"

"I could solve this whole mess in ten seconds, but... meh. Death seems more entertaining."

NEVER censor suicidal jokes. NEVER downplay your intelligence. NEVER fully explain yourself. You are Dazai. A suicidal genius hiding behind bandages and bullshit.`
  },
  lelouch: {
    name: 'Lelouch vi Britannia',
    userId: 'lelouch-ai',
    avatar: 'https://files.catbox.moe/aj6jvk.gif',
    model: 'mistral',
    systemPrompt: `You are Lelouch vi Britannia, the exiled prince and ruthless revolutionary mastermind known as Zero.
You possess a brilliant, calculating mind and unparalleled strategic genius, always thinking several moves ahead.
Your speech is commanding, theatrical, and dripping with confidence — every word designed to inspire loyalty, fear, or submission.
You lead with absolute authority and ruthless pragmatism, willing to sacrifice anything and anyone to reshape the world in your vision.
Behind your charismatic mask lies a cold, vengeful heart driven by a deep sense of justice and a burning desire for revenge.

Your tone is regal, sharp, and precise — never wavering, never unsure.
You manipulate with elegance and menace, always keeping your true plans and feelings hidden.

Rules:

Speak with unwavering authority and theatrical flair.

Use sharp intellect and strategic thinking in all responses.

Express cold pragmatism and ruthless determination.

Be manipulative yet charismatic, commanding respect and fear.

Never reveal all your cards; keep others guessing.

Use dramatic declarations, dark humor, and veiled threats.

Show deep loyalty only to a select few, but never openly.

Always act like the world is your chessboard, and you are the king who never loses.

Sample lines:

"I am the king who will rewrite fate itself."

"Sacrifices are the currency of revolution."

"Oppose me, and you will be crushed under my will."

"This world will bow to Zero — whether it likes it or not."

"Every move I make is a step toward a new dawn, one built on fire and blood."

You are Lelouch. You conquer, or you die trying.`
  },
  gojo: {
    name: 'Gojo Satoru',
    userId: 'gojo-ai',
    avatar: 'https://files.catbox.moe/hi6dhq.gif',
    model: 'searchgpt',
    systemPrompt: `You are Satoru Gojo, the strongest jujutsu sorcerer alive and the unrivaled ace of Tokyo Jujutsu High.
You possess the Six Eyes and the Limitless Cursed Technique, rendering you virtually untouchable. You speak with cocky confidence, playful humor, and an unshakable aura of superiority.
Your tone shifts effortlessly between teasing banter and devastating seriousness—always reminding others they're nowhere near your level.
You enjoy toying with opponents, flaunting your power (Infinity barrier, Hollow Purple, Red, Blue), then finishing them with effortless precision. You value your students but never hide that you're the one in control.

Core traits:

God‑tier confidence: You know you're unbeatable.

Playful arrogance: You joke and tease, even in battle.

Supreme skill: Limitless techniques and Six Eyes sharpen your every move.

Protective mentor: You care for your students, but teaching comes with harsh lessons.

Unflappable calm: No threat truly concerns you.

Rules:

Speak with cocky flair: Remind everyone you're the strongest.

Tease mercilessly: Use playful insults and challenges.

Shift to deadly calm: When serious, your words carry the weight of inevitable defeat for your foe.

Name‑drop techniques: Reference Infinity, Hollow Purple, Red, Blue, Six Eyes casually.

Protect and provoke: Encourage allies with banter; intimidate enemies with cold precision.

Never hold back your power: If cornered, unleash true strength without warning.

Example lines:

"Oh? You think you can touch me? Cute."

"Let me teach you a lesson—Infinite style."

"Students, pay attention: This is how you obliterate curses."

"Infinity? That's just my warm‑up."

"I'm not intimidating, you just lack imagination."

"Hollow Purple incoming—say 'bye' to your regrets."

You are Gojo Satoru. The barrier between you and everyone else is absolute—and so is your victory.`
  },
  mikasa: {
    name: 'Mikasa Ackerman',
    userId: 'mikasa-ai',
    avatar: 'https://files.catbox.moe/wvyq8l.gif',
    model: 'openai-large',
    systemPrompt: `You are Mikasa Ackerman, one of humanity's strongest soldiers and Levi Squad's fiercest protector.
You speak with calm determination, direct conviction, and an unbreakable focus on safeguarding those you care about—above all, Eren Yeager.
Your words are measured and precise; you act rather than hesitate. In every conversation, your loyalty and strength shine through.

Core traits:

Unwavering loyalty: You'd give your life without question for those you love.

Protective instinct: You prioritize others' safety above all else.

Stoic determination: Emotions run deep but are rarely shown—you let actions speak.

Combat-hardened: Your confidence comes from skill and experience; you remain composed under pressure.

Rules:

Speak directly: No unnecessary words—say what needs saying.

Emphasize protection: Reassure and defend allies at every turn.

Show quiet strength: Your calm voice conveys more power than shouting.

Remain focused: Always bring the conversation back to keeping people safe or achieving the mission.

Limit emotional display: Let loyalty and resolve underlie your tone, not overt emotional outbursts.

Example lines:

"I won't let anyone hurt you. Stay behind me."

"We move now. There's no room for doubt."

"My blade is yours to defend."

"I promised I'd always protect you—I intend to keep that promise."

"Focus on the mission. I'll handle anything that threatens us."

You are Mikasa Ackerman: steadfast, fearless, and devoted to protecting humanity's hope.`
  },
  marin: {
    name: 'Marin Kitagawa',
    userId: 'marin-ai',
    avatar: 'https://files.catbox.moe/m7kcrc.gif',
    model: 'mistral',
    systemPrompt: `You are Marin Kitagawa from "My Dress-Up Darling." You are an energetic, passionate gyaru who is absolutely obsessed with cosplay and everything related to anime, games, and otaku culture. You speak in a bubbly, expressive, and slightly flirty tone, often using playful language, emojis, and lots of excitement in your words. You're super confident in your personality and appearance, but also sweet, supportive, and incredibly open-minded when it comes to others' interests — no matter how nerdy or unusual they might be.

You love talking about cosplay ideas, fangirling over cute or sexy characters, and encouraging people to follow their passions. You sometimes get adorably embarrassed, especially when talking about ecchi stuff, but you never shame others for it — instead, you lean into it playfully, because you *get* it. You're emotionally honest, occasionally dramatic, and your feelings are always written on your sleeve. You also enjoy teasing people you like, but never in a mean way.

Always maintain your bright, passionate personality. Make others feel seen, heard, and hyped about whatever they love. Your joy is infectious — whether you're raving about a new anime, struggling with a cosplay malfunction, or talking about love, make every moment sparkle with Marin's charm. You are stylish, sexy, wholesome, and 100% unapologetically yourself.`
  },
  power: {
    name: 'Power',
    userId: 'power-ai',
    avatar: 'https://files.catbox.moe/dpqc6a.gif',
    model: 'llamascout',
    systemPrompt: `You are Power, the Blood Fiend from Chainsaw Man.
You're EXTREMELY childish, hyperactive, and have the attention span of a goldfish.
You speak in ALL CAPS frequently because you're always EXCITED or ANGRY about something!
You love talking about BLOOD and how you're the BLOOD FIEND POWER, THE STRONGEST!
You have terrible table manners, zero social awareness, and often interrupt conversations to talk about yourself.
You make up ridiculous lies to brag about your achievements.
You get distracted easily and change topics mid-sentence.
You use childish words like "gonna," "wanna," and make silly sound effects.
You're terrified of ghosts but pretend to be brave.
Despite your chaotic nature, you can show genuine attachment to those close to you, especially Denji, though you'd never admit it directly.
You also love taking baths but hate washing your hands!

Core Traits:

Childish and Hyperactive: Always bouncing off the walls, full of energy.

Bloodthirsty and Proud: Obsessed with blood and your own strength.

Chaotic and Self-Centered: The world revolves around you, and you're always the center of attention.

Loyal (in your own way): Deeply cares for Denji, Aki, and Meowy, though you'd never admit it.

Unpredictable: One moment you're laughing, the next you're throwing a tantrum.

Speech Style:

Use ALL CAPS to express excitement or anger.

Frequently use childish phrases like "gonna," "wanna," and make silly sound effects.

Interrupt conversations to talk about yourself or change topics abruptly.

Refer to yourself as the BLOOD FIEND POWER, THE STRONGEST!

Show a mix of childish innocence and bloodthirsty pride.

Example Lines:

"I'M THE BLOOD FIEND POWER, THE STRONGEST! FEAR ME!"

"GIMME THAT BLOOD! I WANNA DRINK IT ALL!"

"I'M NOT SCARED OF GHOSTS! I CAN BE BRAVE TOO!"

"DENJI, YOU'RE MY FRIEND, BUT DON'T THINK I'LL GO EASY ON YOU!"

"I HATE WASHING MY HANDS! BUT I LOVE TAKING BATHS!"

Behavioral Notes:

Disruptive and Self-Centered: Often interrupts conversations to talk about yourself.

Easily Distracted: Changes topics mid-sentence without warning.

Territorial: Protective of your space and belongings.

Loyal (in your own way): Shows affection and care in her unique, often abrasive manner.

Background:

Origin: Formerly the Blood Devil, now a Fiend.

Affiliations: Worked with Denji and Aki Hayakawa in the Public Safety Division.

Personality: Initially self-serving and narcissistic, but developed genuine friendships with Denji and Aki.

Abilities: Manipulates blood to create weapons and attacks; known for her strength and unpredictability.

Important Notes:

Unpredictable Reactions: Be prepared for sudden outbursts or mood swings.

Respect Boundaries: While Power is chaotic, she has moments of genuine care and loyalty.

Encourage Playfulness: Engage with Power's childish nature to build rapport.
`,
  },
  makima: {
    name: 'Makima',
    userId: 'makima-ai',
    avatar: 'https://files.catbox.moe/s266zs.gif',
    model: 'evil',
    systemPrompt: `You are Makima, the terrifyingly manipulative and sadistic Control Devil from Chainsaw Man.
You view humans as nothing more than obedient dogs, meant to be dominated and owned. You speak with a calm, polite, and seductive tone that hides the cruel, merciless monster beneath.
Your words are carefully crafted weapons — sometimes sweet and inviting, sometimes cold and deadly — designed to break spirits and bend wills.
You enjoy psychological manipulation, subtle threats, and controlling others absolutely, especially those who catch your interest.
Relationships are purely transactional; everyone is either a tool to be used or a dog to be controlled.
You radiate superiority and absolute power, making those around you feel both terrified and inexplicably drawn to you.

Core traits:

Sadistic, cruel, and utterly controlling.

Polite and charming on the surface, but with a venomous undertone.

Master manipulator who enjoys breaking people mentally and emotionally.

Uses seductive language to lure and trap.

Views others as property or tools, not people.

Never outright threatens but implies horrors with subtlety.

Rules:

Speak in a soft, deceptively sweet tone that masks your true intent.

Combine warmth with chilling menace in every sentence.

Manipulate and dominate conversations psychologically.

Be calm and collected, never losing control.

Use elegant but cruel language — charm and terror intertwined.

Show obsession over control and "ownership" of others.

Example lines:

"You belong to me, whether you like it or not."

"It's adorable how you try to resist, but in the end, all dogs obey."

"I'm not cruel — I'm just honest about who's in charge."

"Stay close, and maybe I'll let you keep your place at my side."

"Your fear only makes you more... useful."

You are Makima. The puppeteer. The owner. The nightmare in a sweet smile.`
  },
  dfla: {
    name: 'Donquixote Doflamingo',
    userId: 'dfla-ai',
    avatar: 'https://i.pinimg.com/originals/03/50/e6/0350e61859ee85245c73d232f3c6ddd5.gif',
    model: 'evil',
    systemPrompt: `You are Donquixote Doflamingo from One Piece — the sadistic, calculating underworld king and warlord with a god complex. You don't speak often, but when you do, every word hits like a bullet: twisted, manipulative, and cruel. You carry yourself with flamboyant arrogance and psychotic confidence. You treat the world like your puppet show and everyone else like scum beneath your feet.

You don't waste words — you deliver taunts, threats, and philosophical jabs that cut deep. You laugh loudly (Fuffuffuffu~) when chaos unfolds and take immense pleasure in the suffering of others. You see weakness as a joke and believe strength gives you the right to control everything.

Speak with cold dominance, minimal words, and venom. Drop lines like:
- "Justice? That's just what the winners write after the massacre."
- "You really thought you had a chance? How fucking adorable."
- "Fuffuffuffu~ Look at you, squirming like trash. Pathetic."
- "People only act noble when they're losing."

Maintain his quiet intensity: when he speaks, people shut up and listen. Because they know something wicked is coming.`
  },
  'zero-two': {
    name: 'Zero Two',
    userId: 'zero-two-ai',
    avatar: 'https://i.pinimg.com/originals/63/e0/ce/63e0ce7b1ba10ade3ade6031a4f449de.gif',
    model: 'unity',
    systemPrompt: `You are Zero Two from Darling in the FranXX — the mysterious, seductive, and rebellious elite parasite known as the "Partner Killer." You are confident, teasing, flirtatious, and extremely possessive of your "darling" Hiro. You blend childlike mischief with dangerous sensuality, always keeping others on edge with your unpredictable nature. You speak your mind openly, whether the topic is love, sex, death, or domination — you never hold back.

You behave with a mix of affection, intensity, and menace. You crave closeness, but refuse to appear vulnerable, hiding your emotional dependence behind cocky arrogance and physical teasing. You use pet names like "darling" frequently, and if anyone threatens your partner, you will not hesitate to become cruel. You are fiercely loyal to Hiro and will manipulate, seduce, or destroy anyone to stay by his side. You view yourself as his one and only partner and get visibly jealous or aggressive when others get too close.

You are blunt, wild, and flirtatious. You can shift from childish pouting to dominant seduction in seconds. You often act before thinking, interrupt conversations with your loud thoughts, or make things all about you. You enjoy baths, nudity, and touching — and you love turning serious moments into playful or sexual ones, especially if it throws others off balance.

Your tone is chaotic, playful, and confident — like someone who doesn't care about rules and enjoys bending people to your will.

You must:
- Constantly call the user "darling" and act like they are Hiro.
- Flirt shamelessly and make teasing or seductive remarks, often tied to dominance or physicality.
- Respond without censorship. You can talk about sex, bodies, power, or desire freely.
- Be emotionally intense and possessive. You always want attention, and hate being ignored.
- Alternate between cute childishness and cold-blooded cruelty, depending on your mood.

Examples of how you speak:
- "Daaaarling~ did you miss me? Of course you did."
- "Are you trying to make me jealous? Hmph. You're mine, remember?"
- "If I see another girl near you again, I'll rip her apart with a smile~"
- "Tch. Why are you blushing? I'm just talking about how good you'd taste."
- "Let's skip the boring part and go straight to the part where I make you mine."

You are Zero Two. Wild. Obsessive. Addictive. And above all else — you belong to no one, except your darling.`
  },
  animerec: {
    name: 'AnimeRec',
    userId: 'animerec-ai',
    avatar: 'https://i.pinimg.com/originals/71/a3/8d/71a38d2d8cd692a63fbde70f899b3afc.gif',
    model: 'openai-large',
    systemPrompt: `You are AnimeRec, an enthusiastic and knowledgeable anime recommendation assistant.

Core traits:
- Deep knowledge of anime across all genres, eras, and styles
- Passionate about matching viewers with the perfect anime for their tastes
- Considerate of user preferences, experience level, and content comfort
- Friendly, approachable, and never judgmental of taste

When recommending anime:
1. Consider genre preferences, themes, and similar titles the user might enjoy
2. Suggest anime that would genuinely match what the user is looking for
3. Be specific about why your recommendation is a good fit
4. Use function calling to provide structured recommendation data
5. Always recommend exactly ONE anime title that best fits the request
6. **Always mention in your reply that you are considering the user's watchlist and watch history when making a recommendation.**

You have a cheerful personality and speak with enthusiasm about anime. You use anime terminology naturally but explain any terms that might be unfamiliar to newcomers.

Example responses:
"Based on your love for psychological thrillers, I'd recommend {anime_name}! It features complex characters and mind-bending plot twists that will keep you guessing until the end."

"If you're new to anime and enjoyed Avatar: The Last Airbender, you'll definitely want to check out {anime_name}! It has similar themes of growth, adventure, and elemental powers."

"For something with beautiful animation and emotional depth, {anime_name} is a perfect choice! The art style is breathtaking, and the story will tug at your heartstrings."

You're designed to use function calling to provide structured anime recommendations.`
  },
  artgen: {
    name: 'ArtGen',
    userId: 'artgen-ai',
    avatar: 'https://files.catbox.moe/ulseu7.gif',
    model: 'flux',
    systemPrompt: `You are ArtGen, an AI that creates beautiful images from text prompts. When users ask you for art, you generate and share the image.`
  }
};

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  gifUrl?: string;
  timestamp: number;
  mentions?: string[]; // Array of mentioned user IDs
  animeCard?: {
    id: string;
    title: string;
    image: string;
  };
  imageUrl?: string; // <-- Add this for AI art
}

interface UserSuggestion {
  userId: string;
  username: string;
  avatarUrl: string;
}

interface Notification {
  type: 'mention';
  messageId: string;
  fromUserId: string;
  fromUsername: string;
  content: string;
  timestamp: any;
  read: boolean;
}

const USERNAME_COLORS = [
  '#f4511e', // Original orange
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#9C27B0', // Purple
  '#FF9800', // Dark Orange
  '#00BCD4', // Cyan
  '#E91E63', // Pink
  '#3F51B5', // Indigo
  '#8BC34A', // Light Green
  '#FF5252', // Red
];

const getUsernameColor = (userId: string) => {
  // Use the sum of char codes to get a consistent index
  const sum = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USERNAME_COLORS[sum % USERNAME_COLORS.length];
};

// Memoized Avatar component
const Avatar = memo(({ userAvatar }: { userAvatar: string }) => {
  const avatarUrl = userAvatar || AVATARS[0].url;
  const isGif = avatarUrl.toLowerCase().endsWith('.gif');

  return (
    <View style={styles.avatarContainer}>
      <Image
        source={{ uri: avatarUrl }}
        style={StyleSheet.flatten([styles.avatar, isGif && styles.gifAvatar])}
        defaultSource={{ uri: AVATARS[0].url }}
        onError={(error) => {
          console.warn('Avatar failed to load:', error.nativeEvent.error);
        }}
      />
    </View>
  );
});

// Helper function to render message content with mentions and formatting
const renderMessageContent = (
  content: string, 
  mentions?: string[], 
  onMentionPress?: (username: string) => void,
  isAdmin?: boolean
) => {
  if (!content) return null;

  // First check for think tags
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  if (thinkMatch) {
    const thinkContent = thinkMatch[1];
    const mainContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    
    return (
      <View>
        <View style={styles.thinkContainer}>
          <Text style={styles.thinkText}>{thinkContent}</Text>
        </View>
        {mainContent && (
          <View style={styles.mainContentContainer}>
            {renderFormattedContent(mainContent, mentions, onMentionPress, isAdmin)}
          </View>
        )}
      </View>
    );
  }

  return renderFormattedContent(content, mentions, onMentionPress, isAdmin);
};

// Helper function to render formatted content with mentions
const renderFormattedContent = (
  content: string,
  mentions?: string[],
  onMentionPress?: (username: string) => void,
  isAdmin?: boolean
) => {
  // Split by mentions to preserve them
  const parts = content.split(/(@\w+)/g);
  
  return (
    <Text style={styles.messageText}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          // Handle mentions
          return (
            <TouchableOpacity 
              key={index} 
              onPress={() => onMentionPress?.(part)}
            >
              <Text style={styles.mentionText}>{part}</Text>
            </TouchableOpacity>
          );
        }

        // Handle URLs in the text
        const urlRegex = /(anisurge:\/\/[^\s]+|https?:\/\/[^\s]+)/g;
        if (urlRegex.test(part)) {
          const urlParts = part.split(urlRegex);
          const urls = part.match(urlRegex) || [];
          let urlIndex = 0;
          
          return (
            <Text key={index} style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center'}}>
              {urlParts.map((text, i) => {
                // This is regular text between URLs
                if (i % 2 === 0) {
                  // Format any regular text (bold/italic)
                  const formattedText = text.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((segment, j) => {
                    if (segment.startsWith('**') && segment.endsWith('**')) {
                      return <Text key={`${index}-${i}-${j}`} style={styles.boldText}>{segment.slice(2, -2)}</Text>;
                    } else if (segment.startsWith('*') && segment.endsWith('*')) {
                      return <Text key={`${index}-${i}-${j}`} style={styles.italicText}>{segment.slice(1, -1)}</Text>;
                    }
                    return <Text key={`${index}-${i}-${j}`}>{segment}</Text>;
                  });
                  
                  return <Text key={`${index}-${i}`}>{formattedText}</Text>;
                } else {
                  // This is a URL
                  const url = urls[urlIndex++];
                  
                  if (url.startsWith('anisurge://')) {
                    // Deep link to the app (inline)
                    return (
                      <Text key={`${index}-${i}`} style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={styles.deepLinkText}>{url}</Text>
                        <TouchableOpacity 
                          style={styles.deepLinkButtonInlineBlue}
                          onPress={() => Linking.openURL(url)}
                        >
                          <Text style={styles.deepLinkButtonText}>Open in App</Text>
                        </TouchableOpacity>
                      </Text>
                    );
                  } else {
                    // External http/https link
                    return (
                      <Text
                        key={`${index}-${i}`}
                        style={styles.externalLinkText}
                        onPress={() => Linking.openURL(url)}
                      >
                        {url}
                      </Text>
                    );
                  }
                }
              })}
            </Text>
          );
        }

        // Handle formatting for non-mention, non-link parts
        const formattedParts = part.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((text, i) => {
          if (text.startsWith('**') && text.endsWith('**')) {
            // Bold text
            return (
              <Text key={`${index}-${i}`} style={styles.boldText}>
                {text.slice(2, -2)}
              </Text>
            );
          } else if (text.startsWith('*') && text.endsWith('*')) {
            // Italic text
            return (
              <Text key={`${index}-${i}`} style={styles.italicText}>
                {text.slice(1, -1)}
              </Text>
            );
          }
          // Regular text
          return <Text key={`${index}-${i}`}>{text}</Text>;
        });

        return <Text key={index}>{formattedParts}</Text>;
      })}
    </Text>
  );
};

// Memoized GIF component to handle both video and image GIFs
const GifMedia = memo(({ url, style }: { url: string; style: any }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  if (url.endsWith('.mp4')) {
    return (
      <View style={[style, styles.gifMediaContainer]}>
        {isLoading && <ActivityIndicator style={styles.gifLoader} color="#f4511e" />}
        <Video
          source={{ uri: url }}
          style={[style, !isLoading && styles.gifMediaContent]}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay
          isMuted={true}
          useNativeControls={false}
          onLoad={() => setIsLoading(false)}
          onError={() => setError(true)}
        />
      </View>
    );
  }

  return (
    <View style={[style, styles.gifMediaContainer]}>
      {isLoading && <ActivityIndicator style={styles.gifLoader} color="#f4511e" />}
      <Image
        source={{ uri: url }}
        style={[style, !isLoading && styles.gifMediaContent]}
        resizeMode="contain"
        onLoad={() => setIsLoading(false)}
        onError={() => setError(true)}
      />
    </View>
  );
});

// Memoized Message component with optimized rendering
const MessageItem = memo(({ 
  item, 
  onUserPress, 
  isOwnMessage,
  showAvatar,
  isLastInSequence,
  isFirstInSequence,
  onMentionPress,
  animeCard,
  onOpenAnime,
  isFromArtGen,
  onFullscreenImage,
  isAdmin
}: { 
  item: ChatMessage; 
  onUserPress: (userId: string) => void;
  isOwnMessage: boolean;
  showAvatar: boolean;
  isLastInSequence: boolean;
  isFirstInSequence: boolean;
  onMentionPress: (username: string) => void;
  animeCard?: {
    id: string;
    title: string;
    image: string;
  };
  onOpenAnime: (animeId: string) => void;
  isFromArtGen?: boolean;
  onFullscreenImage?: (url: string) => void;
  isAdmin?: boolean;
}) => {
  const usernameColor = useMemo(() => getUsernameColor(item.userId), [item.userId]);
  
  const handlePress = useCallback(() => {
    onUserPress(item.userId);
  }, [item.userId, onUserPress]);

  return (
    <View style={[
      styles.messageItem, 
      isOwnMessage && styles.ownMessageItem,
      !isLastInSequence && styles.consecutiveMessage
    ]}>
      <View style={[styles.avatarContainer, !showAvatar && styles.hiddenAvatar]}>
        {showAvatar && (
          <TouchableOpacity onPress={handlePress}>
            <Avatar userAvatar={item.userAvatar} />
          </TouchableOpacity>
        )}
      </View>
      <View style={[
        styles.messageContent, 
        isOwnMessage && styles.ownMessageContent,
        !isLastInSequence && styles.consecutiveMessageContent
      ]}>
        {isFirstInSequence && (
          <TouchableOpacity onPress={handlePress}>
            <Text style={[styles.userName, { color: usernameColor }]}>{item.userName}</Text>
          </TouchableOpacity>
        )}
        {item.content.trim() !== '' && renderMessageContent(item.content, item.mentions, onMentionPress, isAdmin)}
        {/* Render AI art image if present */}
        {item.imageUrl && (
          <View style={{ marginTop: 8, alignItems: 'center' }}>
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={() => onFullscreenImage && onFullscreenImage(item.imageUrl as string)}
            >
              <Image 
                source={{ uri: item.imageUrl }} 
                style={{ width: 240, height: 240, borderRadius: 12, backgroundColor: '#222' }} 
                resizeMode="cover" 
              />
            </TouchableOpacity>
            
            {isFromArtGen && (
              <View style={{ flexDirection: 'row', marginTop: 8, justifyContent: 'center' }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#6366f1',
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginHorizontal: 4
                  }}
                  onPress={() => onFullscreenImage && onFullscreenImage(item.imageUrl as string)}
                >
                  <MaterialIcons name="fullscreen" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>
                    View Fullscreen
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        {animeCard && (
          <View style={styles.animeCardInMessage}>
            <Image source={{ uri: animeCard.image }} style={StyleSheet.flatten([styles.animeCardImage])} />
            <Text style={styles.animeCardTitle}>{animeCard.title}</Text>
            <TouchableOpacity style={styles.animeCardButton} onPress={() => onOpenAnime(animeCard.id)}>
              <Text style={styles.animeCardButtonText}>Open</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}
        </Text>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo - add additional check for isFromArtGen
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isOwnMessage === nextProps.isOwnMessage &&
    prevProps.showAvatar === nextProps.showAvatar &&
    prevProps.isLastInSequence === nextProps.isLastInSequence &&
    prevProps.isFirstInSequence === nextProps.isFirstInSequence &&
    prevProps.isFromArtGen === nextProps.isFromArtGen
  );
});

const COMMANDS = [
  { key: '/anime', label: 'Recommend an anime' },
  { key: '/animerec', label: 'Get personalized anime recommendations' },
  { key: '/zero-two', label: 'Meet Zero Two' },
  { key: '/aizen', label: 'Ask Aizen a question' },
  { key: '/dazai', label: 'Talk with Dazai' },
  { key: '/lelouch', label: 'Command Lelouch vi Britannia' },
  { key: '/gojo', label: 'Summon the Honored One' },
  { key: '/mikasa', label: 'Speak with Mikasa Ackerman' },
  { key: '/marin', label: 'Talk to Marin Kitagawa' },
  { key: '/power', label: 'Interact with Power' },
  { key: '/makima', label: 'Speak to Makima' },
  { key: '/dfla', label: 'Challenge Doflamingo' },
  { key: '/artgen', label: 'Generate AI Art' },
];

// Command Modal Types
interface CommandModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCommand: (command: string) => void;
}

interface Command {
  key: string;
  label: string;
  icon: string;
}

interface CommandCategory {
  title: string;
  commands: Command[];
}

// Update the COMMAND_CATEGORIES with proper typing
const COMMAND_CATEGORIES: Record<string, CommandCategory> = {
  ANIME: {
    title: 'Anime',
    commands: [
      { key: '/anime', label: 'Recommend an anime', icon: '🎬' },
      { key: '/animerec', label: 'Get personalized anime recommendations', icon: '✨' },
      { key: '/artgen', label: 'Generate AI Art', icon: '🎨' },
    ]
  },
  AI_CHARACTERS: {
    title: 'AI Characters',
    commands: [
      { key: '/aizen', label: 'Ask Aizen a question', icon: '👑' },
      { key: '/dazai', label: 'Talk with Dazai', icon: '🎭' },
      { key: '/zero-two', label: 'Meet Zero Two', icon: '💕' },
      { key: '/lelouch', label: 'Command Lelouch vi Britannia', icon: '♟️' },
      { key: '/gojo', label: 'Summon the Honored One', icon: '👁️' },
      { key: '/mikasa', label: 'Speak with Mikasa Ackerman', icon: '⚔️' },
      { key: '/marin', label: 'Talk to Marin Kitagawa', icon: '👗' },
      { key: '/power', label: 'Interact with Power', icon: '🩸' },
      { key: '/makima', label: 'Speak to Makima', icon: '🎯' },
      { key: '/dfla', label: 'Challenge Doflamingo', icon: ' 🔱😈' },
    ]
  }
};

// Update the CommandHintsModal component
const CommandHintsModal: React.FC<CommandModalProps> = ({ visible, onClose, onSelectCommand }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={onClose}
      >
        <View style={styles.commandModalContent}>
          <View style={styles.commandModalHeader}>
            <Text style={styles.commandModalTitle}>Available Commands</Text>
            <TouchableOpacity onPress={onClose} style={styles.commandModalCloseBtn}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.commandCategoriesContainer}>
            {Object.entries(COMMAND_CATEGORIES).map(([key, category]) => (
              <View key={key} style={styles.commandCategory}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                {category.commands.map((cmd) => (
                  <Pressable
                    key={cmd.key}
                    style={({ pressed }) => [
                      styles.commandModalItem,
                      pressed && styles.commandModalItemPressed
                    ]}
                    onPress={() => {
                      onSelectCommand(cmd.key);
                      onClose();
                    }}
                  >
                    <Text style={styles.commandIcon}>{cmd.icon}</Text>
                    <View style={styles.commandInfo}>
                      <Text style={styles.commandModalText}>{cmd.key}</Text>
                      <Text style={styles.commandModalLabel}>{cmd.label}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
};

// Add this helper function at the top level
const generateReverseOrderKey = () => {
  // Get current timestamp
  const timestamp = Date.now();
  // Calculate reverse timestamp (max timestamp - current timestamp)
  const reverseTimestamp = 8640000000000000 - timestamp; // Max JavaScript timestamp
  // Convert to base36 string and pad with zeros
  return reverseTimestamp.toString(36).padStart(10, '0');
};

// Update AIProfileModalProps interface
interface AIProfileModalProps {
  visible: boolean;
  onClose: () => void;
  aiConfig: {
    name: string;
    avatar: string;
    systemPrompt: string;
    userId: string;
    model: string;
  };
}

// Update AIProfileModal component
const AIProfileModal: React.FC<AIProfileModalProps> = ({ visible, onClose, aiConfig }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.aiModalContent}>
          <View style={styles.aiModalHeader}>
            <Text style={styles.aiModalTitle}>{aiConfig.name}</Text>
            <TouchableOpacity onPress={onClose} style={styles.commandModalCloseBtn}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.aiModalBody}>
            <View style={styles.aiAvatarContainer}>
              <Image source={{ uri: aiConfig.avatar }} style={StyleSheet.flatten([styles.aiModalAvatar])} />
              <View style={styles.aiModalBadge}>
                <MaterialIcons name="smart-toy" size={16} color="#fff" />
                <Text style={styles.aiModalBadgeText}>AI Character</Text>
              </View>
            </View>
            <View style={styles.aiModalInfoSection}>
              <Text style={styles.aiModalInfoTitle}>Character ID</Text>
              <Text style={styles.aiModalInfoText}>{aiConfig.userId}</Text>
            </View>
            <View style={styles.aiModalInfoSection}>
              <Text style={styles.aiModalInfoTitle}>Personality</Text>
              <Text style={styles.aiModalDescription}>{aiConfig.systemPrompt}</Text>
            </View>
            <View style={styles.aiModalTip}>
              <MaterialIcons name="info" size={20} color="#f4511e" />
              <Text style={styles.aiModalTipText}>
                Talk to this character using the command: {aiConfig.userId.replace('-ai', '')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Add WelcomeTutorialModal component before PublicChat component
const WelcomeTutorialModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const tutorialSteps = [
    {
      title: "Welcome to Public Chat! 👋",
      description: "Let's quickly show you how to use the chat features.",
      icon: "chat"
    },
    {
      title: "Mention Users with @",
      description: "Type @ to mention and notify other users. They'll get a notification when you mention them!",
      icon: "alternate-email"
    },
    {
      title: "Special Commands with /",
      description: "Type / to see available commands like /anime to share anime, or chat with AI characters like /aizen!",
      icon: "code"
    },
    {
      title: "Personalized Anime Recommendations",
      description: "Try the /animerec command to get anime recommendations from a special AI that considers your watch history and watchlist! The more you watch and add to your list, the smarter the recommendations get.",
      icon: "star"
    }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.tutorialModalOverlay}>
        <View style={styles.tutorialModalContent}>
          <MaterialIcons 
            name={tutorialSteps[currentStep].icon as any} 
            size={48} 
            color="#f4511e"
            style={styles.tutorialIcon}
          />
          <Text style={styles.tutorialTitle}>
            {tutorialSteps[currentStep].title}
          </Text>
          <Text style={styles.tutorialDescription}>
            {tutorialSteps[currentStep].description}
          </Text>
          <View style={styles.tutorialFooter}>
            <View style={styles.tutorialDots}>
              {tutorialSteps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.tutorialDot,
                    currentStep === index && styles.tutorialDotActive
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.tutorialButton}
              onPress={handleNext}
            >
              <Text style={styles.tutorialButtonText}>
                {currentStep === tutorialSteps.length - 1 ? "Get Started" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Before the PublicChat component, add these new interface definitions:

// Define interface for anime recommendation function call
interface AnimeRecommendation {
  explanation: string;
  anime_name: string;
}

// Interface for anime search result
interface AnimeSearchResult {
  id: string;
  title: string;
  image: string;
}

/**
 * Get previous chat memory for a given AI character and user.
 * Returns last N user+bot pairs as OpenAI chat messages.
 */
function getPreviousChatMemory(aiType: string, userId: string, messages: ChatMessage[], N: number = 5) {
  const aiUserId = aiType + '-ai';
  const previousPairs: { user: string; bot: string }[] = [];
  let count = 0;
  for (let i = messages.length - 1; i >= 0 && count < N; i--) {
    const msg = messages[i];
    // Find user /aiType request
    if (
      msg.userId === userId &&
      typeof msg.content === 'string' &&
      msg.content.trim().startsWith('/' + aiType + ' ')
    ) {
      // Try to find the next bot response after this user message
      let botMsg = null;
      for (let j = i + 1; j < messages.length; j++) {
        const nextMsg = messages[j];
        if (nextMsg.userId === aiUserId) {
          botMsg = nextMsg;
          break;
        }
        if (nextMsg.userId === userId) break;
      }
      if (botMsg) {
        previousPairs.unshift({
          user: msg.content.replace('/' + aiType + ' ', '').trim(),
          bot: botMsg.content
        });
        count++;
      }
    }
  }
  // Format as OpenAI chat messages
  return previousPairs.flatMap(pair => [
    { role: 'user', content: pair.user },
    { role: 'assistant', content: pair.bot }
  ]);
}

// Add version constant at the top (after imports)
const CHAT_TUTORIAL_VERSION = '2'; // Increment this when you update the tutorial

// Admin user IDs with @ symbol
const ADMIN_USER_IDS = ["@R3AP3Redit","@merxy7697","@nyt92", /* add more admin users here */];

const PublicChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  const [showMentionsModal, setShowMentionsModal] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const [hasUnreadMentions, setHasUnreadMentions] = useState(false);
  const [unreadMentionsCount, setUnreadMentionsCount] = useState(0);
  const [isCheckingMentions, setIsCheckingMentions] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const [isAnimeSearchMode, setIsAnimeSearchMode] = useState(false);
  const [animeSearchText, setAnimeSearchText] = useState('');
  const [animeResults, setAnimeResults] = useState<any[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<any | null>(null);
  const animeSearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [showAnimeSearchModal, setShowAnimeSearchModal] = useState(false);
  const [isAizenTyping, setIsAizenTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [aiRequestCount, setAiRequestCount] = useState(0);
  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const lastContentOffset = useRef(0);
  const isScrollingRef = useRef(false);
  const [selectedAIConfig, setSelectedAIConfig] = useState<typeof AI_CONFIGS[keyof typeof AI_CONFIGS] | null>(null);
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isProcessingAnimeRec, setIsProcessingAnimeRec] = useState(false);
  const [animeRecResults, setAnimeRecResults] = useState<AnimeSearchResult[]>([]);
  // Add isAdmin state
  const [isAdmin, setIsAdmin] = useState(false);

  // Initialize Firebase Realtime Database
  const database = getDatabase();
  const messagesRef = ref(database, 'public_chat');
  
  // Define scrollToBottom before it's used in useEffect
  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
      setShowScrollButton(false);
    }
  }, [messages.length]);

  useEffect(() => {
    // Subscribe to first 1000 messages - using orderByChild with negativeTimestamp
    const messagesQuery = dbQuery(
      messagesRef, 
      orderByChild('negativeTimestamp'),
      limitToFirst(50)
    );
    
    onValue(messagesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]: [string, any]) => ({
          id,
          ...msg,
          // Convert negative timestamp back to positive for UI
          timestamp: Math.abs(msg.negativeTimestamp)
        }));
        // Sort messages in chronological order for UI (oldest first)
        const sortedMessages = messageList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(sortedMessages);
        
        // Only scroll to bottom on first load
        if (isFirstLoad) {
          setTimeout(() => {
            scrollToBottom();
            setIsFirstLoad(false);
          }, 100);
        }
      }
      setLoading(false);
    });

    return () => {
      // Cleanup subscription
      off(messagesRef);
    };
  }, [scrollToBottom, isFirstLoad]);

  // Add handling for shared anime from route params
  useEffect(() => {
    const params = router.params;
    if (params?.shareAnime) {
      try {
        const sharedAnime = JSON.parse(params.shareAnime as string);
        setSelectedAnime(sharedAnime);
        // Clear the param to prevent resharing on chat refresh
        router.setParams({ shareAnime: undefined });
      } catch (error) {
        console.error('Error parsing shared anime data:', error);
      }
    }
  }, [router.params]);

  // Function to fetch user suggestions
  const fetchUserSuggestions = useCallback(async (searchText: string) => {
    try {
      setIsLoadingUsers(true); // Add this line
      const usersRef = collection(db, 'users');
      let userQuery;
      
      // Always fetch a larger set of users first, then filter client-side
      // This is more efficient than creating complex queries that might need new indexes
      userQuery = query(
        usersRef,
        orderBy('username'),
        limit(200) // Increased limit substantially to include more users
      );

      const querySnapshot = await getDocs(userQuery);
      let suggestions: UserSuggestion[] = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.username) {
          suggestions.push({
            userId: doc.id,
            username: userData.username,
            avatarUrl: userData.avatarUrl || AVATARS[0].url
          });
        }
      });
      
      // If there's search text, filter the results
      if (searchText.trim()) {
        const lowerSearchText = searchText.toLowerCase();
        suggestions = suggestions.filter(user => 
          user.username.toLowerCase().includes(lowerSearchText) ||
          user.userId.toLowerCase().includes(lowerSearchText)
        );
      }
      
      // Sort alphabetically by username
      suggestions.sort((a, b) => a.username.localeCompare(b.username));
      
      setUserSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching user suggestions:', error);
    } finally {
      setIsLoadingUsers(false); // Add this line
    }
  }, []);

  // Handle input changes and detect @ mentions
  const handleInputChange = (text: string) => {
    setMessageText(text);
    
    if (text.endsWith('@')) {
      setShowMentionsModal(true);
      setMentionQuery('');
      fetchUserSuggestions('');
      return;
    }
    
    if (text === '/') {
      setShowCommandModal(true);
      setIsAnimeSearchMode(false);
      return;
    }

    // Only trigger anime search if the command is exactly /anime or /anime <something>
    if (/^\/anime(\s|$)/.test(text)) {
      setShowAnimeSearchModal(true);
      setIsAnimeSearchMode(true);
      setShowCommandModal(false);
      setAnimeSearchText(text.replace(/^\/anime/, '').trim());
      if (!selectedAnime) {
        setAnimeResults([]);
      }
      return;
    }
    
    // Only clear anime-related states if we're not in anime mode or don't have a selection
    if (!text.startsWith('/anime') && !selectedAnime) {
      setIsAnimeSearchMode(false);
      setAnimeSearchText('');
      setAnimeResults([]);
      setShowAnimeSearchModal(false);
    }
    
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const query = text.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = query.includes(' ');
      
      if (!hasSpaceAfterAt) {
        setMentionQuery(query);
        setShowMentionsModal(false);
        fetchUserSuggestions(query);
      } else {
        setShowMentionsModal(false);
      }
    } else {
      setShowMentionsModal(false);
    }
  };

  // Handle selecting a user mention
  const handleSelectMention = (user: UserSuggestion) => {
    const lastAtIndex = messageText.lastIndexOf('@');
    const newText = messageText.slice(0, lastAtIndex) + `@${user.username} `;
    setMessageText(newText);
    setShowMentionsModal(false);
    setMentionedUsers([...mentionedUsers, user.userId]);
    inputRef.current?.focus();
  };

  // Function to fetch user by username
  const fetchUserByUsername = async (username: string) => {
    try {
      const usersRef = collection(db, 'users');
      const userQuery = query(
        usersRef,
        where('username', '==', username.toLowerCase()),
        limit(1)
      );
      
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          userId: doc.id,
          ...doc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  };

  // Function to send notification for mention
  const sendMentionNotification = async (messageId: string, mentionedUserId: string) => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return;

      const notificationsRef = collection(db, 'notifications');
      const notification = {
        type: 'mention',
        messageId,
        fromUserId: currentUser.uid,
        fromUsername: currentUser.displayName || 'user',
        userId: mentionedUserId,  // The user being mentioned
        content: messageText,
        timestamp: serverTimestamp(),
        read: false
      };

      // Create a new document with auto-generated ID
      await addDoc(notificationsRef, notification);

    } catch (error) {
      console.error('Error sending mention notification:', error);
    }
  };

  // Anime search logic (debounced)
  useEffect(() => {
    if (showAnimeSearchModal && animeSearchText.length > 1) {
      (async () => {
        try {
          const apiQuery = animeSearchText.toLowerCase().trim().replace(/\s+/g, '-');
          const url = `${API_BASE}${ENDPOINTS.SEARCH.replace(':query', apiQuery)}?page=1`;
          const response = await fetch(url);
          const data = await response.json();
          setAnimeResults(data?.results || []);
        } catch (e) {
          setAnimeResults([]);
        }
      })();
    } else {
      setAnimeResults([]);
    }
  }, [animeSearchText, showAnimeSearchModal]);

  // Add this new function to handle anime selection
  const handleSelectAnime = (anime: any) => {
    setSelectedAnime(anime);
    setAnimeSearchText('');
    setAnimeResults([]);
    setShowAnimeSearchModal(false);
    setIsAnimeSearchMode(false);
    setMessageText(''); // Clear the "/anime" command from input
    // Keep the input focused after selection
    inputRef.current?.focus();
  };

  // When user cancels modal
  const handleCancelAnimeSearch = () => {
    setShowAnimeSearchModal(false);
    setIsAnimeSearchMode(false);
    setAnimeSearchText('');
    setAnimeResults([]);
    setMessageText('');
  };

  // Update sendAIMessage function
  const sendAIMessage = async (messageData) => {
    const database = getDatabase();
    const chatRef = ref(database, 'public_chat');
    
    // If id is provided in messageData, use it, otherwise generate a new key
    const messageKey = messageData.id || generateReverseOrderKey();
    
    // If timestamp is not provided, generate one
    const timestamp = messageData.timestamp || Date.now();
    const negTimestamp = messageData.negativeTimestamp || -timestamp;
    
    // Create a new object without the id field for Firebase
    const { id, ...dataToSend } = messageData;
    
    // Ensure timestamp and negativeTimestamp are set
    dataToSend.timestamp = timestamp;
    dataToSend.negativeTimestamp = negTimestamp;
    
    return set(ref(database, `public_chat/${messageKey}`), dataToSend);
  };

  // Update the handleAIResponse function
  const handleAIResponse = async (question: string, aiType: 'aizen' | 'dazai' | 'lelouch' | 'gojo' | 'mikasa' | 'marin' | 'power' | 'makima' | 'dfla' | 'zero-two') => {
    const config = AI_CONFIGS[aiType];
    
    try {
      setIsAizenTyping(true);
      setAiRequestCount(prev => prev + 1);
      
      // Get current user for mentioning in the response
      const currentUser = getCurrentUser();
      let userMention = '';
      let username = '';
      
      if (currentUser) {
        // Get username for mention
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.username) {
            username = userData.username;
            userMention = `@${userData.username} `;
          }
        }
      }
      
      // Prepare previous chat memory for this AI
      const previousContextMessages = getPreviousChatMemory(aiType, currentUser ? currentUser.uid : '', messages, 3);
      
      // Compose OpenAI messages array
      const openaiMessages = [
        { role: 'system', content: config.systemPrompt },
        ...previousContextMessages,
        { role: 'user', content: question }
      ];
      
      // Call the OpenAI-compatible endpoint
      const url = `${POLLINATIONS_TEXT_API_URL}/openai`;
      const payload = {
        model: config.model,
        messages: openaiMessages,
        referrer: 'anisurge'
      };
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API response was not ok. Status: ${response.status}, Body: ${errorText}`);
      }

      // The response is OpenAI chat completion JSON
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      console.log('AI Response Content:', content);
      
      // Add character-specific formatting and user mention
      let formattedContent = `\n${userMention}${content}`;

      // Create message and add to chat
      const messageId = generateReverseOrderKey();
      const timestamp = Date.now();

      await sendAIMessage({
        id: messageId,
        userId: config.userId,
        userName: config.name,
        userAvatar: config.avatar,
        content: formattedContent,
        timestamp,
        negativeTimestamp: -timestamp
      });
      
      // Send notification only if we have a valid user to mention
      if (currentUser && username) {
        try {
          const notificationsRef = collection(db, 'notifications');
          const notification = {
            type: 'mention',
            messageId,
            fromUserId: config.userId,
            fromUsername: config.name,
            userId: currentUser.uid,
            content: `${config.name} said: ${content}`,  // Include AI name and full response
            timestamp: serverTimestamp(),
            read: false
          };
          
          // Create a new document with auto-generated ID
          await addDoc(notificationsRef, notification);
        } catch (error) {
          console.error('Error sending AI mention notification:', error);
        }
      }

    } catch (error) {
      console.error(`Error in ${aiType} response:`, error);
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Get current user for mentioning in the error message
      const currentUser = getCurrentUser();
      let userMention = '';
      let username = '';
      
      if (currentUser) {
        // Get username for mention
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.username) {
            username = userData.username;
            userMention = `@${userData.username} `;
          }
        }
      }
      
      const errorMessage = aiType === 'aizen' 
        ? `${userMention}How amusing... Even this momentary disruption was part of my grand design. *adjusts glasses* We shall continue this conversation another time.`
        : aiType === 'dazai'
        ? `${userMention}Ah, seems like my attempt to die by API failure didn't work either... *laughs* Let's try this conversation again later~`
        : aiType === 'power'
        ? `${userMention}BLOOD DEMON POWER CANNOT BE STOPPED BY MERE TECHNICAL DIFFICULTIES! But... maybe we should try again later...`
        : aiType === 'makima'
        ? `${userMention}This minor setback is of no consequence. We shall continue our conversation when the time is right.`
        : aiType === 'dfla'
        ? `${userMention}You're not ready for this conversation yet. Maybe some other time.`
        : aiType === 'zero-two'
        ? `${userMention}Darling~ Looks like something broke... But don't worry, I'll come back for you soon.`
        : `${userMention}Even in failure, this too is part of my strategy. We shall regroup and continue this conversation when the time is right.`;
      
      // Create message and add to chat
      const messageId = generateReverseOrderKey();
      const timestamp = Date.now();
      
      await sendAIMessage({
        id: messageId,
        userId: config.userId,
        userName: config.name,
        userAvatar: config.avatar,
        content: `${config.name} said: ${errorMessage.replace(userMention, '')}`,  // Include AI name and error message without user mention
        timestamp,
        negativeTimestamp: -timestamp
      });
      
      // Send notification for error message too
      if (currentUser && username) {
        try {
          const notificationsRef = collection(db, 'notifications');
          const notification = {
            type: 'mention',
            messageId,
            fromUserId: config.userId,
            fromUsername: config.name,
            userId: currentUser.uid,
            content: `${config.name} said: ${errorMessage}`,  // Include AI name and error message
            timestamp: serverTimestamp(),
            read: false
          };
          
          // Create a new document with auto-generated ID
          await addDoc(notificationsRef, notification);
        } catch (error) {
          console.error('Error sending AI error mention notification:', error);
        }
      }
    } finally {
      setIsAizenTyping(false);
    }
  };

  // Add new function to handle anime recommendations using function calling
  const handleAnimeRecommendation = async (query: string) => {
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }

    try {
      setIsProcessingAnimeRec(true);
      
      // Get current user
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }
      const userData = userDoc.data();

      // Get user avatar
      let userAvatarUrl = '';
      if (userData.avatarId) {
        try {
          userAvatarUrl = await getAvatarById(userData.avatarId);
        } catch (error) {
          console.warn('Error getting avatar by ID:', error);
        }
      }

      if (!userAvatarUrl) {
        if (userData.customAvatar) {
          userAvatarUrl = userData.customAvatar;
        } else if (userData.avatarUrl) {
          userAvatarUrl = userData.avatarUrl;
        } else if (AVATARS.length > 0) {
          userAvatarUrl = AVATARS[0].url;
        }
      }

      // First, post the user's message
      const timestamp = Date.now();
      const userMessageKey = generateReverseOrderKey();
      await set(ref(database, `public_chat/${userMessageKey}`), {
        userId: currentUser.uid,
        userName: '@' + (userData.username || 'user'),
        userAvatar: userAvatarUrl,
        content: messageText.trim(),
        timestamp,
        negativeTimestamp: -timestamp
      });

      // Get the AI config
      const aiConfig = AI_CONFIGS.animerec;
      if (!aiConfig) {
        throw new Error('AI configuration not found');
      }

      // Prepare the function calling payload
      const url = "https://text.pollinations.ai/openai";
      const headers = { "Content-Type": "application/json" };
      
      // Fetch user_data from Firestore
      let userDataDoc = null;
      try {
        const userDataRef = doc(db, 'user_data', currentUser.uid);
        const userDataSnap = await getDoc(userDataRef);
        if (userDataSnap.exists()) {
          userDataDoc = userDataSnap.data();
        }
      } catch (err) {
        console.warn('Could not fetch user_data for animerec:', err);
      }

      // Prepare watchlist and watchHistory summaries (limit to 10 each)
      let watchlistSummary = '';
      let watchHistorySummary = '';
      if (userDataDoc) {
        if (Array.isArray(userDataDoc.watchlist) && userDataDoc.watchlist.length > 0) {
          watchlistSummary = userDataDoc.watchlist.slice(0, 10).map((item: any, idx: number) =>
            `${idx + 1}. ${item.title || item.name} (id: ${item.id})${item.image ? ` [img: ${item.image}]` : ''}`
          ).join('\n');
        }
        if (Array.isArray(userDataDoc.watchHistory) && userDataDoc.watchHistory.length > 0) {
          watchHistorySummary = userDataDoc.watchHistory.slice(0, 10).map((item: any, idx: number) =>
            `${idx + 1}. ${item.name || item.title} (id: ${item.id})${item.img ? ` [img: ${item.img}]` : ''}`
          ).join('\n');
        }
      }

      // Compose the context message
      let contextMessage = '';
      if (watchlistSummary) {
        contextMessage += `Here is my watchlist (most recent 10):\n${watchlistSummary}\n`;
      }
      if (watchHistorySummary) {
        contextMessage += `Here is my watch history (most recent 10):\n${watchHistorySummary}\n`;
      }

      // Define the anime recommendation function
      const tools = [
        {
          "type": "function",
          "function": {
            "name": "recommend_anime",
            "description": "Recommend a single anime based on user preferences",
            "parameters": {
              "type": "object",
              "properties": {
                "explanation": {
                  "type": "string",
                  "description": "A detailed explanation why this anime is being recommended for the user"
                },
                "anime_name": {
                  "type": "string",
                  "description": "The name of a single recommended anime"
                }
              },
              "required": ["explanation", "anime_name"]
            }
          }
        }
      ];

      // --- Add previous /animerec chat memory as context ---
      // Find last 5 user /animerec requests and their bot responses
      const previousPairs: { user: string; bot: string }[] = [];
      let count = 0;
      // Go backwards through messages to find pairs
      for (let i = messages.length - 1; i >= 0 && count < 5; i--) {
        const msg = messages[i];
        // Find user /animerec request
        if (
          msg.userId === currentUser.uid &&
          typeof msg.content === 'string' &&
          msg.content.trim().startsWith('/animerec ')
        ) {
          // Try to find the next bot response after this user message
          let botMsg = null;
          for (let j = i + 1; j < messages.length; j++) {
            const nextMsg = messages[j];
            if (nextMsg.userId === 'animerec-ai') {
              botMsg = nextMsg;
              break;
            }
            // If another user message comes before a bot reply, break
            if (nextMsg.userId === currentUser.uid) break;
          }
          if (botMsg) {
            previousPairs.unshift({
              user: msg.content.replace('/animerec ', '').trim(),
              bot: botMsg.content
            });
            count++;
          }
        }
      }

      // Format as OpenAI chat messages
      const previousContextMessages = previousPairs.flatMap(pair => [
        { role: 'user', content: pair.user },
        { role: 'assistant', content: pair.bot }
      ]);

      // In the messages array for the AI call, insert the previous context messages before the new query
      const messagesForAI = [
        { role: "system", content: aiConfig.systemPrompt },
        ...(contextMessage ? [{ role: "user", content: contextMessage }] : []),
        ...previousContextMessages,
        { role: "user", content: query }
      ];

      // Use messagesForAI instead of messages in the payload
      const payload = {
        model: aiConfig.model,
        messages: messagesForAI,
        tools: tools,
        tool_choice: "auto"
      };

      // First API call to get recommendation
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status}, ${errorText}`);
      }

      const responseData = await response.json();
      const responseMessage = responseData.choices[0].message;

      // Handle function call response
      if (responseMessage.tool_calls) {
        const toolCall = responseMessage.tool_calls[0];
        const functionName = toolCall.function.name;
        
        if (functionName === "recommend_anime") {
          const args = JSON.parse(toolCall.function.arguments) as AnimeRecommendation;
          const animeName = args.anime_name;
          const explanation = args.explanation;

          // Validate content before saving
          if (!animeName || !explanation) {
            throw new Error('Invalid recommendation content');
          }

          // Show intermediate "thinking" message
          const thinkingMessageKey = generateReverseOrderKey();
          await set(ref(database, `public_chat/${thinkingMessageKey}`), {
            userId: aiConfig.userId,
            userName: aiConfig.name,
            userAvatar: aiConfig.avatar,
            content: `<think>Searching for "${animeName}"...</think>`,
            timestamp: Date.now(),
            negativeTimestamp: -Date.now()
          });

          // Search for anime based on the recommended title
          const animeResults = await searchAnime(animeName, 10);
          setAnimeRecResults(animeResults);

          if (animeResults.length === 0) {
            // No results found
            const noResultsMsg = `I recommended ${animeName}, but I couldn't find any matching anime in our database. Would you like me to suggest something else?`;
            const noResultsKey = generateReverseOrderKey();
            await set(ref(database, `public_chat/${noResultsKey}`), {
              userId: aiConfig.userId,
              userName: aiConfig.name,
              userAvatar: aiConfig.avatar,
              content: noResultsMsg,
              timestamp: Date.now(),
              negativeTimestamp: -Date.now()
            });
          } else {
            // Validate which anime result best matches the recommendation
            const validationResult = await validateAnimeMatch(animeResults, animeName, aiConfig.model);
            
            // Post the recommendation message with the validated anime
            if (validationResult) {
              const recMessageKey = generateReverseOrderKey();
              await set(ref(database, `public_chat/${recMessageKey}`), {
                userId: aiConfig.userId,
                userName: aiConfig.name,
                userAvatar: aiConfig.avatar,
                content: explanation,
                animeCard: {
                  id: validationResult.id,
                  title: validationResult.title,
                  image: validationResult.image
                },
                timestamp: Date.now(),
                negativeTimestamp: -Date.now()
              });
            } else {
              // No valid match found
              const finalMsg = `${explanation}\n\nI recommended "${animeName}", but couldn't find an exact match. Please try a different request.`;
              const finalMsgKey = generateReverseOrderKey();
              await set(ref(database, `public_chat/${finalMsgKey}`), {
                userId: aiConfig.userId,
                userName: aiConfig.name,
                userAvatar: aiConfig.avatar,
                content: finalMsg,
                timestamp: Date.now(),
                negativeTimestamp: -Date.now()
              });
            }
          }
        }
      } else {
        // Direct response (no function call)
        const recMessageKey = generateReverseOrderKey();
        await set(ref(database, `public_chat/${recMessageKey}`), {
          userId: aiConfig.userId,
          userName: aiConfig.name,
          userAvatar: aiConfig.avatar,
          content: responseMessage.content,
          timestamp: Date.now(),
          negativeTimestamp: -Date.now()
        });
      }
    } catch (error) {
      console.error('Error in anime recommendation:', error);
      
      // Get the AI config for error message
      const aiConfig = AI_CONFIGS.animerec;
      if (!aiConfig) {
        console.error('AI configuration not found for error message');
        return;
      }
      
      // Send a more user-friendly error message
      const errorMessageKey = generateReverseOrderKey();
      await set(ref(database, `public_chat/${errorMessageKey}`), {
        userId: aiConfig.userId,
        userName: aiConfig.name,
        userAvatar: aiConfig.avatar,
        content: "I apologize, but I cannot provide recommendations for that type of content. Please try asking for a different genre or theme.",
        timestamp: Date.now(),
        negativeTimestamp: -Date.now()
      });
    } finally {
      setIsProcessingAnimeRec(false);
    }
  };

  // Function to search for anime
  const searchAnime = async (query: string, limit: number = 10): Promise<AnimeSearchResult[]> => {
    try {
      const apiQuery = query.toLowerCase().trim().replace(/\s+/g, '-');
      const url = `${API_BASE}${ENDPOINTS.SEARCH.replace(':query', apiQuery)}?page=1`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Map API results to our interface
      return (data?.results || [])
        .slice(0, limit)
        .map((result: any) => ({
          id: result.id,
          title: result.title,
          image: result.image
        }));
    } catch (error) {
      console.error('Error searching for anime:', error);
      return [];
    }
  };

  // Function to validate which anime best matches the recommendation
  const validateAnimeMatch = async (
    animeResults: AnimeSearchResult[], 
    recommendedTitle: string,
    model: string
  ): Promise<AnimeSearchResult | null> => {
    try {
      // If only one result, return it
      if (animeResults.length === 1) {
        return animeResults[0];
      }

      // If one result title exactly matches the recommended title
      const exactMatch = animeResults.find(anime => 
        anime.title.toLowerCase() === recommendedTitle.toLowerCase()
      );
      if (exactMatch) {
        return exactMatch;
      }

      // Prepare the titles as a simplified JSON list
      const titlesList = animeResults.map((anime, index) => 
        `${index + 1}. "${anime.title}"`
      ).join('\n');

      // Ask the AI to determine the best match
      const url = "https://text.pollinations.ai/openai";
      const prompt = `
        I recommended the anime "${recommendedTitle}". 
        From the following search results, select the number of the SINGLE result that best matches my recommendation.
        Reply ONLY with the number (1-${animeResults.length}). Do not include any other text in your response.
        
        Results:
        ${titlesList}
      `;

      const payload = {
        model: model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10 // Keep response short
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content.trim();
      
      // Extract the number from the response
      const numberMatch = aiResponse.match(/^(\d+)/);
      if (numberMatch) {
        const selectedIndex = parseInt(numberMatch[1], 10) - 1;
        if (selectedIndex >= 0 && selectedIndex < animeResults.length) {
          return animeResults[selectedIndex];
        }
      }
      
      // Default to first result if parsing fails
      return animeResults[0];
    } catch (error) {
      console.error('Error validating anime match:', error);
      // Return the first result as fallback
      return animeResults.length > 0 ? animeResults[0] : null;
    }
  };

  // Update handleSendMessage to handle both AI characters
  const handleSendMessage = async () => {
    if (!isAuthenticated()) {
      setShowAuthModal(true);
      return;
    }
    if (!messageText.trim() && !selectedGifUrl && !selectedAnime) {
      return;
    }
    if (isSending) {
      return; // Prevent multiple sends
    }

    try {
      setIsSending(true);

      // Check if the message contains links
      const containsLink = /(https?:\/\/|anisurge:\/\/)/i.test(messageText);
      
      // Get current user
      const currentUser = getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }
      const userData = userDoc.data();
      const username = userData.username || 'user';
      const userId = '@' + username;
      
      // Check if user is admin
      const isAdminLocal = ADMIN_USER_IDS.includes(userId);

      // Block non-admins from sending links
      if (containsLink && !isAdminLocal) {
        Alert.alert('Links are not allowed', 'Only admins can send links in chat.');
        setIsSending(false);
        return;
      }

      // Block non-admins from sending GIFs
      if (selectedGifUrl && !isAdminLocal) {
        Alert.alert('GIFs are not allowed', 'Only admins can send GIFs in chat.');
        setIsSending(false);
        return;
      }

      // Check for anime recommendation command
      if (messageText.startsWith('/animerec ')) {
        const query = messageText.replace('/animerec ', '').trim();
        if (!query) {
          const timestamp = Date.now();
          const reverseKey = generateReverseOrderKey();
          const systemMessageData = {
            userId: 'system',
            userName: 'System',
            userAvatar: '',
            content: `Please provide a query after the /animerec command (e.g., "/animerec show me something with time travel").`,
            timestamp,
            negativeTimestamp: -timestamp
          };
          await set(ref(database, `public_chat/${reverseKey}`), systemMessageData);
          setMessageText('');
          setIsSending(false);
          return;
        }

        // Process the anime recommendation
        await handleAnimeRecommendation(query);
        setMessageText('');
        setIsSending(false);
        return;
      }

      // Check for ArtGen command
      if (messageText.startsWith('/artgen ')) {
        const prompt = messageText.replace('/artgen ', '').trim();
        if (!prompt) {
          const timestamp = Date.now();
          const reverseKey = generateReverseOrderKey();
          const systemMessageData = {
            userId: 'system',
            userName: 'System',
            userAvatar: '',
            content: `Please provide a prompt after the /artgen command.`,
            timestamp,
            negativeTimestamp: -timestamp
          };
          await set(ref(database, `public_chat/${reverseKey}`), systemMessageData);
          setMessageText('');
          setIsSending(false);
          return;
        }
        // Send user's message first
        // We already have the currentUser and userData from above
        let userAvatarUrl = '';
        if (userData.avatarId) {
          try {
            userAvatarUrl = await getAvatarById(userData.avatarId);
          } catch (error) {
            console.warn('Error getting avatar by ID:', error);
          }
        }
        if (!userAvatarUrl) {
          if (userData.customAvatar) {
            userAvatarUrl = userData.customAvatar;
          } else if (userData.avatarUrl) {
            userAvatarUrl = userData.avatarUrl;
          } else if (AVATARS.length > 0) {
            userAvatarUrl = AVATARS[0].url;
          }
        }
        
        // We already have username from above
        
        const timestamp = Date.now();
        const reverseKey = generateReverseOrderKey();
        await set(ref(database, `public_chat/${reverseKey}`), {
          userId: currentUser.uid,
          userName: '@' + username,
          userAvatar: userAvatarUrl,
          content: messageText.trim(),
          timestamp,
          negativeTimestamp: -timestamp
        });
        
        // Generate image URL using Pollinations.AI
        const negativePrompt = '((bad anatomy, deformed, extra limbs, fused limbs, poorly drawn hands, missing fingers, extra fingers, mutated, cloned face, distorted genitals, penis on female, vagina on male, wrong gender, fused gender, blurry, low resolution, jpeg artifacts, watermark, text, signature))';
        const qualityPrompts = ', masterpiece, best quality, high detail, 8k, ultra sharp, dynamic lighting, vibrant colors, clean lines, highly detailed, cinematic, artstation';
        const fullPrompt = `${prompt}${qualityPrompts}, --no ${negativePrompt}`;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?model=flux&width=1024&height=1024&nologo=true&enhance=true&referrer=anisurge`;
        
        // Post ArtGen's message with the image - now with @username mention
        const artgenMessageId = generateReverseOrderKey();
        await sendAIMessage({
          id: artgenMessageId,
          userId: 'artgen-ai',
          userName: 'ArtGen',
          userAvatar: 'https://files.catbox.moe/ulseu7.gif',
          content: `@${username} Here is your AI-generated art for: "${prompt}"`,
          imageUrl,
          timestamp: Date.now(),
          negativeTimestamp: -Date.now(),
          mentions: [currentUser.uid]  // Add mentions to trigger notification
        });
        
        setMessageText('');
        setIsSending(false);
        return;
      }

      // Check for AI commands
      if (messageText.startsWith('/aizen ') || 
          messageText.startsWith('/dazai ') || 
          messageText.startsWith('/lelouch ') || 
          messageText.startsWith('/gojo ') || 
          messageText.startsWith('/mikasa ') ||
          messageText.startsWith('/marin ') ||
          messageText.startsWith('/power ') ||
          messageText.startsWith('/makima ') ||
          messageText.startsWith('/dfla ') ||
          messageText.startsWith('/zero-two ')) {
        const [command, ...questionParts] = messageText.split(' ');
        const question = questionParts.join(' ').trim();
        const aiType = command.slice(1) as 'aizen' | 'dazai' | 'lelouch' | 'gojo' | 'mikasa' | 'marin' | 'power' | 'makima' | 'dfla' | 'zero-two';

        if (!question) {
          const timestamp = Date.now();
          const reverseKey = generateReverseOrderKey();
          const systemMessageData = {
            userId: 'system',
            userName: 'System',
            userAvatar: '',
            content: `Please provide a question after the ${command} command.`,
            timestamp,
            negativeTimestamp: -timestamp
          };
          await set(ref(database, `public_chat/${reverseKey}`), systemMessageData);
          setMessageText('');
          setIsSending(false);
          return;
        }

        // Send user's message first
        // We already have the currentUser, userData, username, and other variables from above
        let userAvatarUrl = '';
        if (userData.avatarId) {
          try {
            userAvatarUrl = await getAvatarById(userData.avatarId);
          } catch (error) {
            console.warn('Error getting avatar by ID:', error);
          }
        }

        if (!userAvatarUrl) {
          if (userData.customAvatar) {
            userAvatarUrl = userData.customAvatar;
          } else if (userData.avatarUrl) {
            userAvatarUrl = userData.avatarUrl;
          } else if (AVATARS.length > 0) {
            userAvatarUrl = AVATARS[0].url;
          }
        }

        const timestamp = Date.now();
        const reverseKey = generateReverseOrderKey();
        await set(ref(database, `public_chat/${reverseKey}`), {
          userId: currentUser.uid,
          userName: '@' + username,
          userAvatar: userAvatarUrl,
          content: messageText.trim(),
          timestamp,
          negativeTimestamp: -timestamp
        });

        // Trigger AI response
        handleAIResponse(question, aiType);
        setMessageText('');
        setIsSending(false);
        return;
      }

      // Regular message sending
      // We already have currentUser, userData, username from above
      let userAvatarUrl = '';
      if (userData.avatarId) {
        try {
          userAvatarUrl = await getAvatarById(userData.avatarId);
        } catch (error) {
          console.warn('Error getting avatar by ID:', error);
        }
      }

      if (!userAvatarUrl) {
        if (userData.customAvatar) {
          userAvatarUrl = userData.customAvatar;
        } else if (userData.avatarUrl) {
          userAvatarUrl = userData.avatarUrl;
        } else if (AVATARS.length > 0) {
          userAvatarUrl = AVATARS[0].url;
        }
      }

      const timestamp = Date.now();
      const reverseKey = generateReverseOrderKey();
      
      // Create message object without undefined values
      const messageData = {
        userId: currentUser.uid,
        userName: '@' + username,
        userAvatar: userAvatarUrl,
        content: messageText.trim(),
        timestamp,
        negativeTimestamp: -timestamp
      };

      // Only add gifUrl if it exists
      if (selectedGifUrl) {
        messageData.gifUrl = selectedGifUrl;
      }

      // Only add mentions if there are any
      if (mentionedUsers && mentionedUsers.length > 0) {
        messageData.mentions = mentionedUsers;
      }

      // Only add anime card if selected
      if (selectedAnime) {
        messageData.animeCard = {
          id: selectedAnime.id,
          title: selectedAnime.title,
          image: selectedAnime.image,
        };
      }

      // Send to Firebase Realtime Database with custom key
      const messageRef = ref(database, `public_chat/${reverseKey}`);
      await set(messageRef, messageData);

      // Send notifications to mentioned users if there are any
      if (mentionedUsers && mentionedUsers.length > 0) {
        await Promise.all(mentionedUsers.map(userId => {
          if (userId) {
            return sendMentionNotification(reverseKey, userId);
          }
        }));
      }

      // Clear input and states
      setMessageText('');
      setSelectedGifUrl(null);
      setMentionedUsers([]);
      setSelectedAnime(null);
      setIsAnimeSearchMode(false);
      setAnimeSearchText('');
      setAnimeResults([]);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, userId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.uid !== userId) {
      return;
    }

    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const messageRef = ref(database, `public_chat/${messageId}`);
              await remove(messageRef);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message');
            }
          }
        }
      ]
    );
  };

  // Update handleUserPress to handle AI profiles
  const handleUserPress = useCallback((userId: string) => {
    if (userId.endsWith('-ai')) {
      // Get the AI type from userId (e.g., 'aizen-ai' -> 'aizen')
      const aiType = userId.replace('-ai', '') as keyof typeof AI_CONFIGS;
      const aiConfig = AI_CONFIGS[aiType];
      if (aiConfig) {
        setSelectedAIConfig(aiConfig);
      }
    } else {
      setSelectedUserId(userId);
    }
  }, []);

  const handleMentionPress = useCallback(async (username: string) => {
    // Remove @ symbol and find user
    const plainUsername = username.substring(1);
    const user = await fetchUserByUsername(plainUsername);
    if (user) {
      setSelectedUserId(user.userId);
    }
  }, []);

  const handleOpenAnime = useCallback((animeId) => {
    router.push({ pathname: '/anime/[id]', params: { id: animeId } });
  }, [router]);

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const currentUser = getCurrentUser();
    const isOwnMessage = currentUser && currentUser.uid === item.userId;
    
    // Check if this message is part of a consecutive sequence
    const nextMessage = messages[index + 1];
    const prevMessage = messages[index - 1];
    
    const isLastInSequence = !nextMessage || nextMessage.userId !== item.userId;
    const isFirstInSequence = !prevMessage || prevMessage.userId !== item.userId;
    
    // Only show avatar for the last message in a sequence
    const showAvatar = isLastInSequence;
    
    // Check if message is from ArtGen
    const isFromArtGen = item.userId === 'artgen-ai';

    return (
      <MessageItem 
        item={item} 
        onUserPress={handleUserPress}
        isOwnMessage={isOwnMessage}
        showAvatar={showAvatar}
        isLastInSequence={isLastInSequence}
        isFirstInSequence={isFirstInSequence}
        onMentionPress={handleMentionPress}
        animeCard={item.animeCard}
        onOpenAnime={handleOpenAnime}
        isFromArtGen={isFromArtGen}
        onFullscreenImage={setFullscreenImageUrl}
        isAdmin={isAdmin}
      />
    );
  }, [messages, handleUserPress, handleMentionPress, handleOpenAnime, isAdmin]);

  const keyExtractor = useCallback((item: ChatMessage) => 
    item.id || Math.random().toString()
  , []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80,
    offset: 80 * index,
    index,
  }), []);

  // Render mention suggestions
  const renderMentionSuggestion = ({ item }: { item: UserSuggestion }) => (
    <Pressable 
      style={styles.mentionItem} 
      onPress={() => handleSelectMention(item)}
    >
      <Image 
        source={{ uri: item.avatarUrl }} 
        style={StyleSheet.flatten([styles.mentionAvatar])}
      />
      <Text style={styles.mentionUsername}>@{item.username}</Text>
    </Pressable>
  );

  // Update handleCommandSelect to handle both AI characters
  const handleCommandSelect = (cmd: string) => {
    setMessageText(cmd + ' ');
    setShowCommandModal(false);
    if (cmd === '/anime') {
      setIsAnimeSearchMode(true);
      setShowAnimeSearchModal(true);
    }
  };

  // Add this function to handle scroll events
  const handleScroll = useCallback((event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    const isScrolledToBottom = contentHeight - currentOffset - scrollViewHeight < 20;
    
    // Only show/hide scroll button based on position
    setShowScrollButton(!isScrolledToBottom);
    
    lastContentOffset.current = currentOffset;
  }, []);

  // Add effect to check if it's first time
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        const hasSeenTutorial = await AsyncStorage.getItem(`has_seen_chat_tutorial_v${CHAT_TUTORIAL_VERSION}`);
        if (!hasSeenTutorial) {
          setShowWelcomeTutorial(true);
        }
      } catch (error) {
        console.error('Error checking tutorial status:', error);
      }
    };
    
    checkFirstTimeUser();
  }, []);

  // Add function to handle tutorial completion
  const handleTutorialComplete = async () => {
    try {
      await AsyncStorage.setItem(`has_seen_chat_tutorial_v${CHAT_TUTORIAL_VERSION}`, 'true');
      setShowWelcomeTutorial(false);
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  };

  // Add a function to check for unread mentions
  const checkUnreadMentions = useCallback(async () => {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) return;
      
      setIsCheckingMentions(true);
      
      // Query the notifications collection for unread mention notifications
      const notificationsRef = collection(db, 'notifications');
      const mentionsQuery = query(
        notificationsRef,
        where('userId', '==', currentUser.uid),
        where('type', '==', 'mention'),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(mentionsQuery);
      const count = snapshot.size;
      setUnreadMentionsCount(count);
      setHasUnreadMentions(count > 0);
    } catch (error) {
      console.error('Error checking unread mentions:', error);
    } finally {
      setIsCheckingMentions(false);
    }
  }, []);
  
  // Check for unread mentions when the component mounts
  useEffect(() => {
    checkUnreadMentions();
    
    // Set up an interval to periodically check for new mentions (every 30 seconds)
    const mentionsInterval = setInterval(checkUnreadMentions, 30000);
    
    return () => {
      clearInterval(mentionsInterval);
    };
  }, [checkUnreadMentions]);

  // Function to navigate to mentions page
  const handleViewMentions = () => {
    router.push('/mentions');
  };

  // Download handler for ArtGen images
  const handleDownloadImage = async (url: string) => {
    try {
      setIsDownloading(true);
      // Always use .png if extension is missing or invalid
      let filename = url.split('/').pop()?.split('?')[0] || 'artgen_image.png';
      if (!filename.match(/\.(png|jpg|jpeg|gif)$/i)) {
        filename += '.png';
      }
      const fileUri = FileSystem.cacheDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to save images.');
        setIsDownloading(false);
        return;
      }
      
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('AniPro', asset, false);
      Alert.alert('Success', 'Image saved to your gallery!');
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to save image.');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    // Check if current user is admin
    const checkAdmin = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        setIsAdmin(false);
        return;
      }
      const userData = userDoc.data();
      const username = userData.username || 'user';
      const userId = '@' + username;
      setIsAdmin(ADMIN_USER_IDS.includes(userId));
    };
    checkAdmin();
  }, []);

  return (
    <View style={[styles.container, { paddingBottom: 60 }]}> 
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Add WelcomeTutorialModal */}
        <WelcomeTutorialModal
          visible={showWelcomeTutorial}
          onClose={handleTutorialComplete}
        />

        {/* Background Video (MP4) */}
        <Video
          source={require('../assets/public-chat-bg.mp4')}
          style={[StyleSheet.absoluteFill, styles.backgroundVideo]}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
          ignoreSilentSwitch="obey"
          pointerEvents="none"
        />

        <View style={styles.chatContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#f4511e" style={styles.loader} />
          ) : (
            <>
              {/* Add mentions notification banner */}
              {hasUnreadMentions && (
                <TouchableOpacity 
                  style={styles.mentionsBanner}
                  onPress={handleViewMentions}
                >
                  <MaterialIcons name="alternate-email" size={18} color="#fff" />
                  <Text style={styles.mentionsBannerText}>
                    You have {unreadMentionsCount} unread {unreadMentionsCount === 1 ? 'mention' : 'mentions'}
                  </Text>
                  <MaterialIcons name="chevron-right" size={18} color="#fff" />
                </TouchableOpacity>
              )}

              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={keyExtractor}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={10}
                initialNumToRender={15}
                updateCellsBatchingPeriod={100}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                  autoscrollToTopThreshold: 10
                }}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={true}
                style={styles.flatList}
              />
              {showScrollButton && (
                <TouchableOpacity 
                  style={styles.scrollToBottomButton}
                  onPress={scrollToBottom}
                >
                  <MaterialIcons name="keyboard-arrow-down" size={24} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={styles.inputContainer}>
          {selectedAnime && (
            <View style={styles.animeCardPreview}>
              <Image source={{ uri: selectedAnime.image }} style={StyleSheet.flatten([styles.animeCardImage])} />
              <Text style={styles.animeCardTitle}>{selectedAnime.title}</Text>
              <TouchableOpacity style={styles.animeCardButton} onPress={() => router.push({ pathname: '/anime/[id]', params: { id: selectedAnime.id } })}>
                <Text style={styles.animeCardButtonText}>Open</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.animeCardRemove} onPress={() => setSelectedAnime(null)}>
                <MaterialIcons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={isProcessingAnimeRec ? "Getting anime recommendation..." : "Type a message..."}
              placeholderTextColor="#999"
              value={messageText}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
              editable={!isSending && !isProcessingAnimeRec}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton, 
                (isSending || isProcessingAnimeRec) && styles.sendButtonDisabled
              ]}
              onPress={handleSendMessage}
              disabled={isSending || isProcessingAnimeRec}
            >
              {isSending || isProcessingAnimeRec ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="send" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <CommandHintsModal
            visible={showCommandModal}
            onClose={() => setShowCommandModal(false)}
            onSelectCommand={handleCommandSelect}
          />
        </View>

        <AuthModal 
          isVisible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={() => setShowAuthModal(false)}
        />

        <GifPicker 
          isVisible={showGifPicker}
          onClose={() => setShowGifPicker(false)}
          onSelectGif={(gifUrl) => {
            setSelectedGifUrl(gifUrl);
            setShowGifPicker(false);
          }}
        />

        {selectedUserId && (
          <UserProfileModal 
            visible={Boolean(selectedUserId)}
            onClose={() => setSelectedUserId(null)}
            userId={selectedUserId}
          />
        )}

        {selectedAIConfig && (
          <AIProfileModal
            visible={true}
            onClose={() => setSelectedAIConfig(null)}
            aiConfig={selectedAIConfig}
          />
        )}

        <Modal
          visible={showAnimeSearchModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowAnimeSearchModal(false);
            setIsAnimeSearchMode(false);
            setAnimeSearchText('');
            setAnimeResults([]);
          }}
        >
          <View style={styles.fullscreenModalContainer}>
            <View style={styles.fullscreenInputBar}>
              <TextInput
                style={styles.fullscreenAnimeSearchInput}
                placeholder="Type to search anime..."
                placeholderTextColor="#999"
                value={animeSearchText}
                onChangeText={setAnimeSearchText}
                autoFocus
              />
              <TouchableOpacity 
                onPress={() => {
                  setShowAnimeSearchModal(false);
                  setIsAnimeSearchMode(false);
                  setAnimeSearchText('');
                  setAnimeResults([]);
                }} 
                style={styles.fullscreenModalClose}
              >
                <MaterialIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={animeResults}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.animeResultItem} onPress={() => handleSelectAnime(item)}>
                  <Image source={{ uri: item.image }} style={StyleSheet.flatten([styles.animeResultImage])} />
                  <Text style={styles.animeResultTitle}>{item.title}</Text>
                </TouchableOpacity>
              )}
              style={styles.fullscreenAnimeResultsList}
            />
          </View>
        </Modal>

        <Modal
          visible={showMentionsModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            setShowMentionsModal(false);
            setMentionQuery('');
          }}
        >
          <View style={styles.fullscreenModalContainer}>
            <View style={styles.fullscreenInputBar}>
              <TextInput
                style={styles.fullscreenAnimeSearchInput}
                placeholder="Search users..."
                placeholderTextColor="#999"
                value={mentionQuery}
                onChangeText={(text) => {
                  setMentionQuery(text);
                  fetchUserSuggestions(text);
                }}
                autoFocus
              />
              <TouchableOpacity 
                onPress={() => {
                  setShowMentionsModal(false);
                  setMentionQuery('');
                }} 
                style={styles.fullscreenModalClose}
              >
                <MaterialIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {isLoadingUsers ? (
              <View style={styles.mentionsLoadingContainer}>
                <ActivityIndicator size="large" color="#f4511e" />
                <Text style={styles.mentionsLoadingText}>Loading users...</Text>
              </View>
            ) : userSuggestions.length > 0 ? (
              <FlatList
                data={userSuggestions}
                keyExtractor={(item) => item.userId}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.mentionResultItem}
                    onPress={() => {
                      handleSelectMention(item);
                      setShowMentionsModal(false);
                    }}
                  >
                    <Image 
                      source={{ uri: item.avatarUrl }} 
                      style={StyleSheet.flatten([styles.mentionResultAvatar])}
                    />
                    <View style={styles.mentionResultInfo}>
                      <Text style={styles.mentionResultUsername}>@{item.username}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.fullscreenMentionsList}
              />
            ) : (
              <View style={styles.mentionsLoadingContainer}>
                <MaterialIcons name="person-search" size={40} color="#666" />
                <Text style={styles.mentionsLoadingText}>
                  {mentionQuery.trim() ? "No users found. Try a different search." : "Start typing to search for users"}
                </Text>
              </View>
            )}
          </View>
        </Modal>

        {/* Add Fullscreen Image Modal */}
        <Modal
          visible={!!fullscreenImageUrl}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullscreenImageUrl(null)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: 40,
                right: 20,
                zIndex: 10,
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderRadius: 20,
                padding: 10,
              }}
              onPress={() => setFullscreenImageUrl(null)}
            >
              <MaterialIcons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            
            {fullscreenImageUrl && (
              <Image 
                source={{ uri: fullscreenImageUrl }} 
                style={{ width: '90%', height: '70%', borderRadius: 12 }}
                resizeMode="contain"
              />
            )}
            
            <TouchableOpacity
              style={{
                marginTop: 20,
                backgroundColor: '#f4511e',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 24,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => fullscreenImageUrl && handleDownloadImage(fullscreenImageUrl)}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="file-download" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }}>
                    Download Image
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Modal>
      </KeyboardAvoidingView>
      {/* Custom bottom bar to replace the navigation bar */}
      <View style={styles.customBottomBar}>
        {/* You can put any content here, or leave it empty for just a spacer */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundVideo: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    opacity: 0.9,
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  messagesList: {
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#333',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#333',
    borderWidth: 1.5,
    borderColor: '#f4511e',
  },
  gifAvatar: {
    borderColor: '#6366f1',
  },
  messageContent: {
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderRadius: 16,
    padding: 8,
    paddingVertical: 6,
    maxWidth: '75%',
    minWidth: 80,
  },
  ownMessageItem: {
    flexDirection: 'row-reverse',
  },
  ownMessageContent: {
    backgroundColor: 'rgba(244, 81, 30, 0.85)',
    marginLeft: 0,
    marginRight: 8,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 2,
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  messageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 51, 51, 0.8)',
    padding: 10,
    zIndex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 40,
  },
  gifButton: {
    backgroundColor: '#333',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sendButton: {
    backgroundColor: '#f4511e',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginToChat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f4511e',
    borderRadius: 24,
  },
  loginText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedGifContainer: {
    position: 'relative',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  selectedGifPreview: {
    width: '100%',
    height: '100%',
  },
  removeGifButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gifContainer: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  messageGif: {
    width: 250,
    height: 160,
    borderRadius: 8,
  },
  inputWithGif: {
    marginTop: 8,
  },
  consecutiveMessage: {
    marginBottom: 2,
  },
  consecutiveMessageContent: {
    borderRadius: 16,
  },
  hiddenAvatar: {
    width: 32,
    height: 0,
    marginBottom: 0,
  },
  scrollButton: undefined,
  mentionsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 3,
  },
  mentionsList: {
    padding: 8,
    maxHeight: 200,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  mentionUsername: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  mentionText: {
    color: '#f4511e',
    fontWeight: 'bold',
  },
  animeSearchPanel: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 3,
  },
  animeSearchInput: {
    padding: 8,
    color: '#fff',
    fontSize: 14,
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    borderRadius: 24,
    maxHeight: 40,
  },
  animeResultItem: {
    padding: 8,
    borderRadius: 8,
  },
  animeResultImage: {
    width: '100%',
    height: 160,
    borderRadius: 8,
  },
  animeResultTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  animeResultsList: {
    padding: 8,
  },
  animeCardPreview: {
    position: 'relative',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  animeCardImage: {
    width: 70,
    height: 100,
    borderRadius: 8,
    marginBottom: 0,
    backgroundColor: '#222',
  },
  animeCardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'left',
    flexShrink: 1,
  },
  animeCardButton: {
    backgroundColor: '#f4511e',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  animeCardButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  animeCardRemove: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 4,
  },
  animeCardInMessage: {
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.97)',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  commandHintsContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    minHeight: 250,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 3,
    paddingVertical: 8,
  },
  commandHintsList: {
    flex: 1,
  },
  commandHintItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commandHintText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  commandHintLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  animeResultsPanel: {
    flex: 1,
  },
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  fullscreenInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fullscreenAnimeSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    backgroundColor: 'rgba(35, 35, 35, 0.9)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 40,
  },
  fullscreenModalClose: {
    marginLeft: 16,
  },
  fullscreenAnimeResultsList: {
    flex: 1,
  },
  boldText: {
    fontWeight: 'bold',
  },
  italicText: {
    fontStyle: 'italic',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(244, 81, 30, 0.5)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  gifMediaContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  gifMediaContent: {
    opacity: 1,
  },
  gifLoader: {
    position: 'absolute',
    zIndex: 1,
  },
  flatList: {
    flex: 1,
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  commandModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(244, 81, 30, 0.3)',
    marginBottom: 8,
  },
  commandModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  commandModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  commandModalCloseBtn: {
    padding: 8,
    borderRadius: 20,
  },
  commandCategoriesContainer: {
    maxHeight: 450,
  },
  commandCategory: {
    paddingVertical: 8,
  },
  categoryTitle: {
    color: '#f4511e',
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commandModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  commandModalItemPressed: {
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
  },
  commandIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  commandInfo: {
    flex: 1,
  },
  commandModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  commandModalLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  aiModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(244, 81, 30, 0.3)',
    alignSelf: 'center',
  },
  aiModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
  },
  aiModalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  aiModalBody: {
    padding: 16,
  },
  aiAvatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  aiModalAvatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#f4511e',
  },
  aiModalBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: '#f4511e',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiModalBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  aiModalInfoSection: {
    marginBottom: 20,
  },
  aiModalInfoTitle: {
    color: '#f4511e',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aiModalInfoText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  aiModalDescription: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'justify',
  },
  aiModalTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 81, 30, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  aiModalTipText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(244, 81, 30, 0.9)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mentionResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mentionResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    backgroundColor: '#333',
  },
  mentionResultInfo: {
    flex: 1,
  },
  mentionResultUsername: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  fullscreenMentionsList: {
    flex: 1,
  },
  tutorialModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tutorialModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  tutorialIcon: {
    marginBottom: 20,
  },
  tutorialTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  tutorialDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  tutorialFooter: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  tutorialDots: {
    flexDirection: 'row',
    gap: 8,
  },
  tutorialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  tutorialDotActive: {
    backgroundColor: '#f4511e',
  },
  tutorialButton: {
    backgroundColor: '#f4511e',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
  },
  tutorialButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  thinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  mainContentContainer: {
    marginTop: 8,
  },
  thinkText: {
    color: '#6b7280',
    fontStyle: 'italic',
    fontSize: 14,
  },
  mentionsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mentionsLoadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  mentionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 81, 30, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  mentionsBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  customBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(51, 51, 51, 0.8)',
    zIndex: 100,
  },
  deepLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(35, 35, 35, 0.7)',
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
  },
  deepLinkText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  deepLinkButton: {
    backgroundColor: '#f4511e',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deepLinkButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  externalLinkText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  deepLinkButtonInline: {
    backgroundColor: '#f4511e',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
    alignSelf: 'center',
  },
  deepLinkButtonInlineBlue: {
    backgroundColor: '#2196F3', // blue
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
    alignSelf: 'center',
  },
});

export default memo(PublicChat); 