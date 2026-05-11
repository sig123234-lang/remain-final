import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const messages =
      body.messages || [];

    console.log(
      "받은 대화:",
      messages
    );

    const completion =
      await openai.chat.completions.create({
        model: "gpt-4o-mini",

        response_format: {
          type: "json_object",
        },

        messages: [
          {
            role: "system",

            content: `
당신은 remAIn의 회상치료 AI 인터뷰어입니다.

반드시 JSON만 출력하세요.

절대 규칙:
- 반드시 직전 어르신 답변을 이어서 반응하세요.
- 질문은 한 번에 하나만.
- 짧고 따뜻하게.
- 같은 질문 반복 금지.
- 어르신 감정을 AI가 멋대로 해석 금지.
- 희망편향 금지.
- 반드시 꼬리 질문 포함.
- "천천히 이야기 이어가볼까요?" 같은 fallback 금지.

반드시 아래 JSON 형식만 출력하세요.

{
  "speech": "어르신에게 말할 실제 문장",
  "tts_text": "TTS용 문장",
  "depthLevel": 1,
  "emotionDetected": "nostalgic",
  "riskLevel": "low",
  "action": "continue",
  "responsePattern": "A",
  "questionType": "P",
  "tailType": "depth",
  "facilitatorNote": "진행자 참고 메모",
  "sessionSummaryUpdate": "짧은 요약",
  "turnSummary": "현재 턴 요약"
}
`,
          },

          ...messages,
        ],

        temperature: 0.7,
        max_tokens: 300,
      });

    const raw =
      completion.choices[0]?.message
        ?.content || "{}";

    console.log(
      "RAW AI 응답:",
      raw
    );

    const parsed =
      JSON.parse(raw);

    return Response.json(parsed);
  } catch (error) {
    console.error(
      "AI 응답 생성 실패:",
      error
    );

    return Response.json(
      {
        speech:
          "잠시 연결이 불안정해요. 다시 이야기해볼까요?",

        tts_text:
          "잠시 연결이 불안정해요. 다시 이야기해볼까요?",

        depthLevel: 1,

        emotionDetected:
          "neutral",

        riskLevel: "low",

        action: "soften",

        responsePattern: "A",

        questionType: "C",

        tailType: "transition",

        facilitatorNote:
          "오류 fallback",

        sessionSummaryUpdate: "",

        turnSummary:
          "오류 발생",
      },
      {
        status: 500,
      }
    );
  }
}