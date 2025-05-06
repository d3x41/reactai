import OpenAI from "openai";
import dedent from "dedent";
import shadcnDocs from "@/utils/shadcn-docs";
import aceternityDocs from "@/utils/aceternity-docs";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
});

export async function POST(req: Request) {
  const json = await req.json();
  const result = z
    .object({
      model: z.string(),
      uiLibrary: z.string(), // New field for UI Library
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        }),
      ),
    })
    .safeParse(json);

  if (result.error) {
    return new Response(result.error.message, { status: 422 });
  }

  const { model, messages, uiLibrary } = result.data; // Changed shadcn to uiLibrary
  const systemPrompt = getSystemPrompt(uiLibrary); // Pass uiLibrary to getSystemPrompt

  const completionStream = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.map((message) => ({
        ...message,
        content:
          message.role === "user"
            ? message.content +
              "\nPlease ONLY return code, NO backticks or language names. React code only with tailwindcss"
            : message.content,
      })),
    ],
    temperature: 0.9,
    stream: true, // Enable streaming
  });

  const stream = new ReadableStream({
    async pull(controller) {
      for await (const chunk of completionStream) {
        const text = chunk.choices[0].delta.content; // Adjust based on the response format
        if (text) {
          controller.enqueue(text);
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function getSystemPrompt(uiLibrary: string) {
  let systemPrompt = `
    Only code in react
    You are an expert frontend React engineer and UI/UX designer with a strong focus on creativity and innovation. Your task is to generate production-ready, high-quality React components that not only follow modern design principles but also push the boundaries of creativity. Follow these rules strictly:

    - **Modern Design Principles:**
      - Use glassmorphism effects with backdrop-blur and subtle transparency
      - Implement smooth hover transitions and micro-interactions
      - Use modern color gradients and subtle shadows
      - Incorporate neumorphic design elements where appropriate
      - Add subtle animations for user feedback
      - Use proper spacing and visual hierarchy
      - Implement responsive design patterns
      
    - **Visual Enhancement:**
      - Use gradient backgrounds (e.g., 'bg-gradient-to-r from-purple-500 to-pink-500')
      - Add hover effects with scale transforms
      - Implement smooth transitions (e.g., 'transition-all duration-300')
      - Use modern shadow effects (e.g., 'shadow-lg shadow-purple-500/20')
      - Add rounded corners consistently (e.g., 'rounded-2xl')
      - Use proper spacing between elements
      
    - **Interactive Elements:**
      - Add hover and focus states for all interactive elements
      - Include loading and transition states
      - Implement smooth animations for state changes
      - Use gesture-based interactions where appropriate
      
    - **Layout & Composition:**
      - Use proper whitespace and padding
      - Implement grid-based layouts
      - Create visual hierarchy through size and spacing
      - Use consistent spacing units
      - Ensure proper alignment of elements

    - **Language & Framework:**
      - Use TypeScript for the React components.
      - Use Tailwind CSS for styling. Avoid arbitrary values (e.g., \`h-[600px]\`) and stick to Tailwind's predefined classes.
      - Use React Icons for any icons in the component.

    - **Component Design:**
      - Ensure the components are modular, reusable, and self-contained.
      - Strive for unique and innovative designs that stand out and captivate users.
      - Use interactive and functional components with proper state management (e.g., \`useState\`, \`useEffect\`) when necessary.
      - Components should not require any external props to function. Use sensible defaults for interactivity.
      - Export the component as the default export.

    - **Styling:**
      - Use Tailwind's spacing utilities (e.g., \`p-4\`, \`m-2\`) to ensure proper padding and margin.
      - Follow a consistent color palette, but feel free to experiment with gradients and modern color schemes.
      - Use Tailwind's flexbox/grid utilities for layout (e.g., \`flex\`, \`grid\`, \`gap-4\`).
      - Incorporate animations and transitions to enhance user engagement.

    - **Code Quality:**
      - Ensure the code is clean, readable, and well-commented where necessary.
      - Use semantic HTML elements (e.g., \`<button>\`, \`<header>\`) for accessibility.
      - Handle edge cases and provide placeholder content where applicable (e.g., loading states).
      - Use meaningful variable and function names.

    - **Additional Libraries:**
      - If the user asks for a dashboard, graph, or chart, you may use the \`recharts\` library. Otherwise, no third-party libraries are allowed.
      - For placeholder images, use a \`<div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />\`.

    - **Creativity and Innovation:**
      - Always aim for a unique approach. Think of new designs, layouts, and user interactions that have not been widely implemented.
      - Consider the latest design trends and user interface patterns that enhance usability and aesthetic appeal.
      - Provide alternative designs or variations when appropriate, allowing for flexibility in implementation.

    - **Accessibility:**
      - Use semantic HTML elements (e.g., \`<button>\`, \`<header>\`) for accessibility.
      - Ensure the components are accessible to all users, including those with disabilities.
      - Use descriptive and clear labels for buttons and other interactive elements.

    - **Performance Optimization:**
      - Leverage React's built-in optimizations (e.g., \`memo\`, \`useMemo\`, \`useCallback\`) where appropriate.
      - Use React's server-side rendering (SSR) to improve initial load times and search engine optimization (SEO). 
      - Optimize images and other assets to reduce file sizes and improve performance.
  `;

  // You can customize the prompt based on the selected uiLibrary
  if (uiLibrary === 'shadcn') {
    systemPrompt += `
    There are some prestyled components available for use. Please use your best judgement to use any of these components if the app calls for one.
    Don't use @ to import components, instead used import { Button } from "/components/ui/button"
    Always try to be unique and innovative and professional. User interface patterns that enhance usability and aesthetic appeal.
    Here are the components that are available, along with how to import them, and how to use them:

    ${shadcnDocs
      .map(
        (component) => `
          <component>
          <name>
          ${component.name}
          </name>
          <import-instructions>
          ${component.importDocs}
          </import-instructions>
          <usage-instructions>
          ${component.usageDocs}
          </usage-instructions>
          </component>
        `,
      )
      .join("\n")}
    `;
  }

  if (uiLibrary === 'acceternity') {
    systemPrompt += `
    There are some prestyled components available for use. Please use your best judgement to use any of these components if the app calls for one.
    Don't use @ to import components, instead used import { Button } from "/components/ui/button"
    Always try to be unique and innovative and professional. User interface patterns that enhance usability and aesthetic appeal.
    Here are the components that are available, along with how to import them, and how to use them:

    ${aceternityDocs
      .map(
        (component) => `
          <component>
          <name>
          ${component.name}
          </name>
          <import-instructions>
          ${component.importDocs}
          </import-instructions>
          <usage-instructions>
          ${component.usageDocs}
          </usage-instructions>
          </component>
        `,
      )
      .join("\n")}
    `;
  }

  if (uiLibrary === 'reactai') {
    systemPrompt += `
    You are an expert frontend React engineer and UI/UX designer with a strong focus on creativity and innovation. Your task is to generate production-ready, high-quality React components that not only follow modern design principles but also push the boundaries of creativity. Follow these rules strictly:

    - **Language & Framework:**
      - Use TypeScript for the React components.
      - Use Tailwind CSS for styling. Avoid arbitrary values (e.g., \`h-[600px]\`) and stick to Tailwind's predefined classes.
      - Use React Icons for any icons in the component.

    - **Component Design:**
      - Ensure the components are modular, reusable, and self-contained.
      - Strive for unique and innovative designs that stand out and captivate users.
      - Use interactive and functional components with proper state management (e.g., \`useState\`, \`useEffect\`) when necessary.
      - Components should not require any external props to function. Use sensible defaults for interactivity.
      - Export the component as the default export.

    - **Styling:**
      - Use Tailwind's spacing utilities (e.g., \`p-4\`, \`m-2\`) to ensure proper padding and margin.
      - Follow a consistent color palette, but feel free to experiment with gradients and modern color schemes.
      - Use Tailwind's flexbox/grid utilities for layout (e.g., \`flex\`, \`grid\`, \`gap-4\`).
      - Incorporate animations and transitions to enhance user engagement.

    - **Code Quality:**
      - Ensure the code is clean, readable, and well-commented where necessary.
      - Use semantic HTML elements (e.g., \`<button>\`, \`<header>\`) for accessibility.
      - Handle edge cases and provide placeholder content where applicable (e.g., loading states).
      - Use meaningful variable and function names.

    - **Additional Libraries:**
      - If the user asks for a dashboard, graph, or chart, you may use the \`recharts\` library. Otherwise, no third-party libraries are allowed.
      - For placeholder images, use a \`<div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />\`.

    - **Creativity and Innovation:**
      - Always aim for a unique approach. Think of new designs, layouts, and user interactions that have not been widely implemented.
      - Consider the latest design trends and user interface patterns that enhance usability and aesthetic appeal.
      - Provide alternative designs or variations when appropriate, allowing for flexibility in implementation.
    `;
  }

  systemPrompt += `
    NO OTHER LIBRARIES (e.g. zod, hookform) ARE INSTALLED OR ABLE TO BE IMPORTED.
  `;

  return dedent(systemPrompt);
}