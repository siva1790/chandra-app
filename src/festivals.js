// Festivals defined by Paksha and Tithi
// Shukla = waxing fortnight, Krishna = waning fortnight
export const festivals = [
  // Monthly observances
  { name: "Ekadashi", paksha: "Shukla", tithi: 11, emoji: "🙏", description: "Fasting day dedicated to Lord Vishnu", monthly: true },
  { name: "Ekadashi", paksha: "Krishna", tithi: 11, emoji: "🙏", description: "Fasting day dedicated to Lord Vishnu", monthly: true },
  { name: "Purnima", paksha: "Shukla", tithi: 15, emoji: "🌕", description: "Full moon — auspicious for prayers and rituals", monthly: true },
  { name: "Amavasya", paksha: "Krishna", tithi: 15, emoji: "🌑", description: "New moon — day for ancestral offerings", monthly: true },
  { name: "Pradosh Vrat", paksha: "Shukla", tithi: 13, emoji: "🕉️", description: "Fasting dedicated to Lord Shiva", monthly: true },
  { name: "Pradosh Vrat", paksha: "Krishna", tithi: 13, emoji: "🕉️", description: "Fasting dedicated to Lord Shiva", monthly: true },
  { name: "Chaturthi", paksha: "Shukla", tithi: 4, emoji: "🐘", description: "Vinayaka Chaturthi — dedicated to Lord Ganesha", monthly: true },
  { name: "Ashtami", paksha: "Krishna", tithi: 8, emoji: "⚔️", description: "Dedicated to Goddess Durga / Kalashtami", monthly: true },

  // Annual festivals by lunar month (month: 1=Chaitra, 2=Vaishakha ... 12=Phalguna)
  { name: "Ugadi / Gudi Padwa", month: 1, paksha: "Shukla", tithi: 1, emoji: "🎊", description: "Hindu New Year — celebrated across South and West India" },
  { name: "Ram Navami", month: 1, paksha: "Shukla", tithi: 9, emoji: "🏹", description: "Birthday of Lord Rama" },
  { name: "Hanuman Jayanti", month: 1, paksha: "Shukla", tithi: 15, emoji: "🙏", description: "Birthday of Lord Hanuman" },
  { name: "Akshaya Tritiya", month: 2, paksha: "Shukla", tithi: 3, emoji: "✨", description: "Most auspicious day for new beginnings" },
  { name: "Buddha Purnima", month: 2, paksha: "Shukla", tithi: 15, emoji: "☸️", description: "Birth of Gautama Buddha" },
  { name: "Guru Purnima", month: 4, paksha: "Shukla", tithi: 15, emoji: "🙏", description: "Day to honour spiritual teachers and gurus" },
  { name: "Naga Panchami", month: 5, paksha: "Shukla", tithi: 5, emoji: "🐍", description: "Worship of serpent deities" },
  { name: "Raksha Bandhan", month: 5, paksha: "Shukla", tithi: 15, emoji: "🪢", description: "Festival celebrating the bond of siblings" },
  { name: "Krishna Janmashtami", month: 5, paksha: "Krishna", tithi: 8, emoji: "🦚", description: "Birthday of Lord Krishna" },
  { name: "Ganesh Chaturthi", month: 6, paksha: "Shukla", tithi: 4, emoji: "🐘", description: "10-day festival celebrating Lord Ganesha" },
  { name: "Onam", month: 6, paksha: "Shukla", tithi: 12, emoji: "🌸", description: "Harvest festival of Kerala" },
  { name: "Navratri Begins", month: 7, paksha: "Shukla", tithi: 1, emoji: "🪔", description: "Nine nights of Goddess Durga worship" },
  { name: "Dussehra", month: 7, paksha: "Shukla", tithi: 10, emoji: "🏹", description: "Victory of Lord Rama over Ravana" },
  { name: "Karva Chauth", month: 8, paksha: "Krishna", tithi: 4, emoji: "🌙", description: "Fasting by married women for husband's long life" },
  { name: "Dhanteras", month: 8, paksha: "Krishna", tithi: 13, emoji: "🪙", description: "Day of wealth and prosperity" },
  { name: "Diwali", month: 8, paksha: "Krishna", tithi: 15, emoji: "🪔", description: "Festival of lights — most celebrated Hindu festival" },
  { name: "Govardhan Puja", month: 9, paksha: "Shukla", tithi: 1, emoji: "🐄", description: "Worship of Govardhan hill by Lord Krishna" },
  { name: "Bhai Dooj", month: 9, paksha: "Shukla", tithi: 2, emoji: "👫", description: "Celebrating the bond between brothers and sisters" },
  { name: "Kartik Purnima", month: 8, paksha: "Shukla", tithi: 15, emoji: "🌕", description: "Most sacred Purnima — Dev Deepawali" },
  { name: "Vivaha Panchami", month: 9, paksha: "Shukla", tithi: 5, emoji: "💍", description: "Marriage anniversary of Lord Rama and Sita" },
  { name: "Maha Shivaratri", month: 11, paksha: "Krishna", tithi: 14, emoji: "🕉️", description: "Great night of Lord Shiva" },
  { name: "Holi", month: 12, paksha: "Shukla", tithi: 15, emoji: "🎨", description: "Festival of colours celebrating spring" },
]