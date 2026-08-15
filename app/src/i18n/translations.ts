// Translation catalogue.
//
// Language choice follows where African football talent actually is, not
// raw speaker counts:
//   fr - the largest talent-exporting bloc by some distance: Senegal,
//        Ivory Coast, Cameroon, Mali, Guinea, DRC
//   sw - East Africa, including this project's home market (Kenya,
//        Tanzania, Uganda, eastern DRC)
//   pt - Angola, Mozambique, Cape Verde, Guinea-Bissau
//
// Arabic (Egypt, Morocco, Algeria, Tunisia) is deliberately absent for now:
// it needs right-to-left layout support across every screen, which is a
// dedicated pass rather than a translation file. Shipping the strings
// without the layout work would look broken, which is worse than English.
//
// Keys are grouped by surface and named for meaning, not for the English
// wording, so rewording the source copy doesn't invalidate translations.

export const translations = {
  en: {
    common: {
      login: 'Log in',
      createAccount: 'Create Account',
      continue: 'Continue',
      cancel: 'Cancel',
      notNow: 'Not now',
      back: 'Go back',
      retry: 'Retry',
      loading: 'Loading',
      somethingWrong: 'Something went wrong',
    },
    welcome: {
      title: 'Welcome to Matobev',
      tagline: 'Discover. Analyze. Connect.\nWhere football talent meets opportunity.',
      browseFirst: "See who's getting rated — no account needed",
    },
    browse: {
      title: 'Players on Matobev',
      lede:
        'Real players. Real ratings. Verified scouts are already here — add your highlights and get rated too.',
      cta: "Get Rated — It's Free",
      haveAccount: 'Already have an account?',
      empty: 'No players to show yet.',
      signUpPrompt: 'Create a free account',
    },
    offline: {
      banner: 'No connection — showing saved content',
    },
    profileStrength: {
      title: 'Profile strength',
      complete: 'Your profile is complete — scouts see everything.',
      addVideo: 'Upload a highlight',
      addPhoto: 'Add a profile photo',
      addClub: 'Add your current club',
      addBio: 'Write a short bio',
      addHeight: 'Add your height',
      addSecondPosition: 'Add a secondary position',
      addSocial: 'Link a social profile',
    },
    push: {
      title: "Don't miss your moment",
      sub: "Scouts move fast. We'll only notify you when something real happens:",
      reasonViewed: 'A scout viewed your profile',
      reasonMessage: 'A scout sent you a message',
      reasonAccepted: 'Your trial application was accepted',
      reasonRating: 'Your video rating is ready',
      fine: 'No spam, and you can turn these off anytime in Settings.',
      enable: 'Turn on notifications',
    },
    safety: {
      title: 'Staying safe with scouts',
      noMoney: 'No real scout asks you for money.',
      noMoneyBody:
        'Not for trials, not for registration, not for travel. A request for payment is the clearest sign of a scam.',
      clubPays: 'A real club pays your way.',
      clubPaysBody:
        'Under FIFA rules, a club inviting you to a trial covers travel, accommodation and meals.',
      verified: 'Verified means we checked.',
      verifiedBody:
        "A verified scout submitted identity and organisation documents that our team reviewed. Unverified accounts can't message you at all.",
      tellSomeone: 'Tell someone you trust.',
      tellSomeoneBody:
        'Bring a parent, guardian or your coach into any conversation about a trial before you agree to anything.',
      readGuide: 'Read the full safety guide',
      reportWrong: 'Report anything that feels wrong',
    },
  },

  fr: {
    common: {
      login: 'Se connecter',
      createAccount: 'Créer un compte',
      continue: 'Continuer',
      cancel: 'Annuler',
      notNow: 'Pas maintenant',
      back: 'Retour',
      retry: 'Réessayer',
      loading: 'Chargement',
      somethingWrong: "Une erreur s'est produite",
    },
    welcome: {
      title: 'Bienvenue sur Matobev',
      tagline: 'Découvrir. Analyser. Connecter.\nLà où le talent rencontre l\'opportunité.',
      browseFirst: 'Voyez qui est déjà noté — sans compte',
    },
    browse: {
      title: 'Joueurs sur Matobev',
      lede:
        'De vrais joueurs. De vraies notes. Des recruteurs vérifiés sont déjà là — ajoutez vos vidéos et faites-vous noter.',
      cta: 'Faites-vous noter — gratuit',
      haveAccount: 'Vous avez déjà un compte ?',
      empty: 'Aucun joueur à afficher pour le moment.',
      signUpPrompt: 'Créez un compte gratuit',
    },
    offline: {
      banner: 'Pas de connexion — contenu enregistré',
    },
    profileStrength: {
      title: 'Profil complété',
      complete: 'Votre profil est complet — les recruteurs voient tout.',
      addVideo: 'Ajoutez une vidéo',
      addPhoto: 'Ajoutez une photo de profil',
      addClub: 'Ajoutez votre club actuel',
      addBio: 'Rédigez une courte bio',
      addHeight: 'Ajoutez votre taille',
      addSecondPosition: 'Ajoutez un poste secondaire',
      addSocial: 'Liez un réseau social',
    },
    push: {
      title: 'Ne ratez pas votre chance',
      sub: 'Les recruteurs vont vite. Nous vous préviendrons uniquement en cas de nouveauté réelle :',
      reasonViewed: 'Un recruteur a vu votre profil',
      reasonMessage: 'Un recruteur vous a écrit',
      reasonAccepted: 'Votre candidature a été acceptée',
      reasonRating: 'Votre note est prête',
      fine: 'Pas de spam, et vous pouvez tout désactiver dans les Réglages.',
      enable: 'Activer les notifications',
    },
    safety: {
      title: 'Votre sécurité face aux recruteurs',
      noMoney: "Un vrai recruteur ne demande jamais d'argent.",
      noMoneyBody:
        "Ni pour un essai, ni pour une inscription, ni pour le voyage. Une demande de paiement est le signe le plus clair d'une arnaque.",
      clubPays: 'Un vrai club paie vos frais.',
      clubPaysBody:
        "Selon les règles de la FIFA, le club qui vous invite à un essai prend en charge le voyage, l'hébergement et les repas.",
      verified: 'Vérifié veut dire contrôlé.',
      verifiedBody:
        "Un recruteur vérifié a fourni des documents d'identité et d'organisation examinés par notre équipe. Les comptes non vérifiés ne peuvent pas vous écrire.",
      tellSomeone: "Parlez-en à quelqu'un de confiance.",
      tellSomeoneBody:
        "Impliquez un parent, un tuteur ou votre entraîneur dans toute discussion sur un essai avant d'accepter quoi que ce soit.",
      readGuide: 'Lire le guide de sécurité',
      reportWrong: 'Signaler ce qui vous semble anormal',
    },
  },

  sw: {
    common: {
      login: 'Ingia',
      createAccount: 'Fungua akaunti',
      continue: 'Endelea',
      cancel: 'Ghairi',
      notNow: 'Si sasa',
      back: 'Rudi',
      retry: 'Jaribu tena',
      loading: 'Inapakia',
      somethingWrong: 'Kuna hitilafu imetokea',
    },
    welcome: {
      title: 'Karibu Matobev',
      tagline: 'Gundua. Changanua. Unganisha.\nMahali vipaji vya soka hukutana na fursa.',
      browseFirst: 'Ona wanaopimwa sasa — bila akaunti',
    },
    browse: {
      title: 'Wachezaji kwenye Matobev',
      lede:
        'Wachezaji halisi. Alama halisi. Waangalizi waliothibitishwa wapo — ongeza video zako upimwe pia.',
      cta: 'Pimwa — ni bure',
      haveAccount: 'Tayari una akaunti?',
      empty: 'Hakuna wachezaji kwa sasa.',
      signUpPrompt: 'Fungua akaunti bure',
    },
    offline: {
      banner: 'Hakuna mtandao — unaona maudhui yaliyohifadhiwa',
    },
    profileStrength: {
      title: 'Ukamilifu wa wasifu',
      complete: 'Wasifu wako umekamilika — waangalizi wanaona kila kitu.',
      addVideo: 'Pakia video',
      addPhoto: 'Ongeza picha ya wasifu',
      addClub: 'Ongeza klabu yako',
      addBio: 'Andika maelezo mafupi',
      addHeight: 'Ongeza urefu wako',
      addSecondPosition: 'Ongeza nafasi ya pili',
      addSocial: 'Unganisha mtandao wa kijamii',
    },
    push: {
      title: 'Usikose nafasi yako',
      sub: 'Waangalizi wanaenda haraka. Tutakujulisha tu kunapotokea jambo halisi:',
      reasonViewed: 'Mwangalizi ameona wasifu wako',
      reasonMessage: 'Mwangalizi amekutumia ujumbe',
      reasonAccepted: 'Ombi lako la jaribio limekubaliwa',
      reasonRating: 'Alama zako za video ziko tayari',
      fine: 'Hakuna taka taka, na unaweza kuzima katika Mipangilio.',
      enable: 'Washa arifa',
    },
    safety: {
      title: 'Usalama wako na waangalizi',
      noMoney: 'Mwangalizi halisi hakuombi pesa.',
      noMoneyBody:
        'Si kwa majaribio, si kwa usajili, si kwa safari. Kuombwa pesa ni ishara wazi ya ulaghai.',
      clubPays: 'Klabu halisi hulipa gharama zako.',
      clubPaysBody:
        'Kwa sheria za FIFA, klabu inayokualika kwenye jaribio hulipia safari, malazi na chakula.',
      verified: 'Kuthibitishwa maana yake tumehakiki.',
      verifiedBody:
        'Mwangalizi aliyethibitishwa aliwasilisha vitambulisho vilivyokaguliwa na timu yetu. Akaunti zisizothibitishwa haziwezi kukutumia ujumbe.',
      tellSomeone: 'Mwambie mtu unayemwamini.',
      tellSomeoneBody:
        'Mshirikishe mzazi, mlezi au kocha wako kabla ya kukubali chochote kuhusu jaribio.',
      readGuide: 'Soma mwongozo wa usalama',
      reportWrong: 'Ripoti chochote kinachokutia shaka',
    },
  },

  pt: {
    common: {
      login: 'Entrar',
      createAccount: 'Criar conta',
      continue: 'Continuar',
      cancel: 'Cancelar',
      notNow: 'Agora não',
      back: 'Voltar',
      retry: 'Tentar novamente',
      loading: 'A carregar',
      somethingWrong: 'Algo correu mal',
    },
    welcome: {
      title: 'Bem-vindo à Matobev',
      tagline: 'Descobrir. Analisar. Conectar.\nOnde o talento encontra a oportunidade.',
      browseFirst: 'Veja quem já está avaliado — sem conta',
    },
    browse: {
      title: 'Jogadores na Matobev',
      lede:
        'Jogadores reais. Avaliações reais. Já há olheiros verificados — junte os seus vídeos e seja avaliado também.',
      cta: 'Seja avaliado — é grátis',
      haveAccount: 'Já tem uma conta?',
      empty: 'Ainda não há jogadores para mostrar.',
      signUpPrompt: 'Crie uma conta gratuita',
    },
    offline: {
      banner: 'Sem ligação — a mostrar conteúdo guardado',
    },
    profileStrength: {
      title: 'Perfil completo',
      complete: 'O seu perfil está completo — os olheiros veem tudo.',
      addVideo: 'Carregue um vídeo',
      addPhoto: 'Adicione uma foto de perfil',
      addClub: 'Adicione o seu clube atual',
      addBio: 'Escreva uma breve biografia',
      addHeight: 'Adicione a sua altura',
      addSecondPosition: 'Adicione uma posição secundária',
      addSocial: 'Ligue uma rede social',
    },
    push: {
      title: 'Não perca a sua oportunidade',
      sub: 'Os olheiros são rápidos. Só avisamos quando acontece algo real:',
      reasonViewed: 'Um olheiro viu o seu perfil',
      reasonMessage: 'Um olheiro enviou-lhe uma mensagem',
      reasonAccepted: 'A sua candidatura foi aceite',
      reasonRating: 'A avaliação do seu vídeo está pronta',
      fine: 'Sem spam, e pode desativar nas Definições.',
      enable: 'Ativar notificações',
    },
    safety: {
      title: 'A sua segurança com olheiros',
      noMoney: 'Nenhum olheiro verdadeiro lhe pede dinheiro.',
      noMoneyBody:
        'Nem por testes, nem por inscrição, nem por viagem. Um pedido de pagamento é o sinal mais claro de burla.',
      clubPays: 'Um clube verdadeiro paga as suas despesas.',
      clubPaysBody:
        'Pelas regras da FIFA, o clube que o convida para um teste cobre viagem, alojamento e refeições.',
      verified: 'Verificado significa que confirmámos.',
      verifiedBody:
        'Um olheiro verificado entregou documentos de identidade e da organização analisados pela nossa equipa. Contas não verificadas não lhe podem enviar mensagens.',
      tellSomeone: 'Fale com alguém de confiança.',
      tellSomeoneBody:
        'Envolva um pai, encarregado de educação ou o seu treinador antes de aceitar seja o que for.',
      readGuide: 'Ler o guia de segurança',
      reportWrong: 'Denunciar algo que pareça errado',
    },
  },
} as const;

export type Locale = keyof typeof translations;
export const SUPPORTED_LOCALES: { code: Locale; label: string; english: string }[] = [
  { code: 'en', label: 'English', english: 'English' },
  { code: 'fr', label: 'Français', english: 'French' },
  { code: 'sw', label: 'Kiswahili', english: 'Swahili' },
  { code: 'pt', label: 'Português', english: 'Portuguese' },
];
