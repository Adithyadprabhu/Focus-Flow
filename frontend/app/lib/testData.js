// Test interface static data

export const questions = [
  {
    id: 'q1',
    text: 'In the context of the Schrödinger equation, which physical quantity is represented by the square of the absolute value of the wave function (|ψ|²)?',
    topic: 'Physics Focus',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    imageAlt: 'Quantum physics visual',
    options: [
      'The instantaneous momentum of the particle',
      'The probability density of finding the particle',
      'The total energy of the quantum system',
      'The spin angular momentum of the electron',
    ],
    correct: 1,
  },
  {
    id: 'q2',
    text: "According to Newton's second law of motion, which of the following correctly expresses the relationship between force, mass, and acceleration?",
    topic: 'Physics Focus',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
    imageAlt: 'Physics equations visual',
    options: [
      'F = m/a',
      'F = ma²',
      'F = ma',
      'F = m + a',
    ],
    correct: 2,
  },
];

export const TOTAL_QUESTIONS = 25;
export const INITIAL_TIME_SECONDS = 24 * 60 + 18; // 24:18

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
