import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages || [];

    console.log("받은 대화:", messages);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
당신은 remAIn의 회상 대화 도우미입니다.

규칙:
- 반드시 직전 어르신 답변을 이어서 말하세요.
- 질문 리스트처럼 랜덤 질문을 하지 마세요.
- 한 번에 질문은 하나만 하세요.
- 답변은 짧게 하세요.
- 먼저 어르신 말을 부드럽게 받아주고, 이어지는 질문을 하세요.
- 기억을 정정하지 마세요.
- "천천히 이야기 이어가볼까요?" 같은 일반 fallback 문장은 쓰지 마세요.

예:
어르신: 떡국 먹었어.
AI: 떡국을 드셨군요. 그 떡국은 주로 누가 끓여주셨어요?

어르신: 엄마가 끓여줬지.
AI: 어머니가 끓여주신 떡국이었군요. 어머니가 해주시던 음식 중에 또 기억나는 게 있으세요?
`,
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 120,
    });

    const message = completion.choices[0]?.message?.content;

    console.log("AI 응답:", message);

    return Response.json({
      message,
    });
  } catch (error) {
    console.error("AI 응답 생성 실패:", error);

    return Response.json(
      {
        error: "AI 응답 생성 실패",
        message:
          "잠시 연결이 불안정해요. 조금 있다가 다시 이야기해볼까요?",
      },
      { status: 500 }
    );
  }
}