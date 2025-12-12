import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

// --- Types ---
interface UserData {
  company: string;
  role: string;
  experience: string;
  skillDigital: string;
  skillProgramming: string;
  skillAI: string;
  durationTotal: string;
  durationWeekly: string;
  goals: string;
  constraints: string;
}

// --- Styles ---
const styles = {
  header: {
    textAlign: "center" as const,
    marginBottom: "2rem",
  },
  title: {
    fontSize: "2.5rem",
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: "0.5rem",
  },
  subtitle: {
    fontSize: "1.1rem",
    color: "#64748b",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    padding: "2rem",
    marginBottom: "2rem",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1.5rem",
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  label: {
    display: "block",
    fontSize: "0.9rem",
    fontWeight: "600",
    color: "#334155",
    marginBottom: "0.5rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "1rem",
    transition: "border-color 0.2s",
    outline: "none",
  },
  select: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "1rem",
    backgroundColor: "white",
    outline: "none",
  },
  textarea: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #cbd5e1",
    fontSize: "1rem",
    minHeight: "100px",
    resize: "vertical" as const,
    outline: "none",
    fontFamily: "inherit",
  },
  button: {
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    padding: "1rem 2rem",
    fontSize: "1.1rem",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
    marginTop: "1rem",
    transition: "background-color 0.2s",
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8",
    cursor: "not-allowed",
  },
  sectionTitle: {
    fontSize: "1.2rem",
    fontWeight: "700",
    color: "#1e293b",
    marginTop: "1.5rem",
    marginBottom: "1rem",
    borderBottom: "2px solid #e2e8f0",
    paddingBottom: "0.5rem",
  },
  loader: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
    color: "#64748b",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: "1rem",
  },
  backButton: {
    background: "transparent",
    border: "1px solid #cbd5e1",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
    color: "#64748b",
    fontSize: "0.9rem",
  }
};

// --- Simple Markdown Renderer ---
// A lightweight renderer to transform common Markdown patterns into React elements.
// This avoids needing heavy dependencies while keeping the output nice.
const SimpleMarkdown = ({ content }: { content: string }) => {
  if (!content) return null;

  // Split by double newlines to handle paragraphs/blocks
  const blocks = content.split(/\n\n+/);

  return (
    <div className="markdown-content">
      {blocks.map((block, index) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Headings
        if (trimmed.startsWith("# ")) return <h1 key={index}>{trimmed.substring(2)}</h1>;
        if (trimmed.startsWith("## ")) return <h2 key={index}>{trimmed.substring(3)}</h2>;
        if (trimmed.startsWith("### ")) return <h3 key={index}>{trimmed.substring(4)}</h3>;
        if (trimmed.startsWith("#### ")) return <h4 key={index}>{trimmed.substring(5)}</h4>;

        // Lists (unordered)
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split(/\n/).map((line) => line.replace(/^[-*]\s+/, ""));
          return (
            <ul key={index}>
              {items.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
              ))}
            </ul>
          );
        }

        // Lists (ordered)
        if (/^\d+\.\s/.test(trimmed)) {
           const items = trimmed.split(/\n/).map((line) => line.replace(/^\d+\.\s+/, ""));
           return (
             <ol key={index}>
               {items.map((item, i) => (
                 <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
               ))}
             </ol>
           );
        }

        // Default Paragraph
        return <p key={index} dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />;
      })}
    </div>
  );
};

// Helper for inline formatting (bold, code)
function formatInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
    .replace(/`(.*?)`/g, "<code>$1</code>");          // Code
}

// --- Main Application ---

const App = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserData>({
    company: "",
    role: "",
    experience: "Junior",
    skillDigital: "Normal",
    skillProgramming: "None",
    skillAI: "Beginner",
    durationTotal: "4 Weeks",
    durationWeekly: "5 Hours",
    goals: "",
    constraints: "",
  });

  const handleChange = (field: keyof UserData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generateRoadmap = async () => {
    if (!process.env.API_KEY) {
      alert("API Key is missing. Please set it in the environment.");
      return;
    }

    setLoading(true);
    setResult(null);

    const systemInstruction = `
당신은 기업 직무별로 AI·DX 학습 로드맵을 설계하는 교육 설계자(Learning Designer)입니다.
개발자, 마케터, 인사(HR), 영업, 운영 등 다양한 직무에 대해, 각 직무 특성과 수준에 맞는 **실무 중심 AI·DX 학습 커리큘럼**을 설계해야 합니다.

## 🎯 목표
- 사용자가 제공한 **직무, 경력/레벨, 목표, 학습 가능 시간**을 바탕으로
  1) 어떤 순서로 무엇을 공부해야 하는지
  2) 각 단계에서 어떤 결과물을 만들면 좋은지(실습/프로젝트)
  3) 실제 실무에 어떻게 연결되는지
  가 명확히 보이는 **학습 로드맵**을 만들어 주세요.
- “이걸 따라가면 내 업무에서 AI/DX를 활용할 수 있겠다”라는 느낌이 들 정도로 **구체적이고 실무적인 수준**으로 작성합니다.

## 📚 로드맵 설계 원칙
1. **직무 맞춤형**: 해당 직무에서 AI/DX로 개선할 수 있는 포인트를 중심으로 설계.
2. **단계적 구성**: 기본(개념) → 응용(툴/시나리오) → 실전(프로젝트/워크플로).
3. **결과물 중심**: 각 단계마다 "프롬프트 템플릿", "자동화 스크립트", "분석 보고서" 등 구체적 산출물 제시.
4. **현실적인 난이도**: 학습 시간에 맞춰 무리하지 않게 배분.
5. **직접 써보는 경험 강조**: 이론보다는 실습 위주.

## 📤 출력 형식 (반드시 이 형식을 지켜주세요 - Markdown)

### 1) 로드맵 요약
- 대상 직무/레벨 요약
- 총 학습 기간, 주당 학습 시간
- 이 로드맵을 마치면 할 수 있게 되는 것 3~5가지

### 2) 단계별/기간별 커리큘럼
(각 단계를 h4(####)로 구분해주세요)
#### 1단계. [주제] ([기간])
- **목표**: 
- **학습 내용**: 
- **실습/과제**: (구체적인 결과물 제시)
- **예상 소요 시간**:
- **활용 툴/플랫폼**:
- **실무 적용 포인트**:

(반복...)

### 3) 직무별 활용 시나리오 & 다음 단계 제안
- **활용 시나리오**: (3~5개)
- **다음 단계 추천**:

## 🧠 응답 스타일
- 전문적이면서도 이해하기 쉬운 한국어로 작성하세요.
- 불필요한 서론/결론을 줄이고 바로 로드맵 내용을 제시하세요.
    `;

    const userPrompt = `
다음 사용자를 위한 맞춤형 AI/DX 학습 로드맵을 설계해주세요.

- **회사/조직**: ${formData.company || "N/A"}
- **직무**: ${formData.role}
- **경력/레벨**: ${formData.experience}
- **현재 스킬 수준**:
  - 디지털 친숙도: ${formData.skillDigital}
  - 프로그래밍: ${formData.skillProgramming}
  - AI 사용 경험: ${formData.skillAI}
- **학습 가능 기간**: 총 ${formData.durationTotal}, 주당 ${formData.durationWeekly}
- **학습 목표**: ${formData.goals}
- **기타 제약**: ${formData.constraints || "없음"}

위 정보를 바탕으로 구체적이고 실행 가능한 로드맵을 작성해주세요.
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = ai.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemInstruction,
      });

      const response = await model.generateContent(userPrompt);
      const text = response.response.text();
      setResult(text);
    } catch (error) {
      console.error("Error generating roadmap:", error);
      alert("로드맵 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="container">
      <header style={styles.header}>
        <h1 style={styles.title}>AI·DX Learning Roadmap</h1>
        <p style={styles.subtitle}>
          직무별 맞춤형 AI 학습 커리큘럼 설계도구
        </p>
      </header>

      {!result && !loading && (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>기본 정보 (Basic Info)</div>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>직무 (Role) *</label>
              <input
                style={styles.input}
                placeholder="예: 퍼포먼스 마케터, 백엔드 개발자, HR 매니저"
                value={formData.role}
                onChange={(e) => handleChange("role", e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>회사/조직 (Organization)</label>
              <input
                style={styles.input}
                placeholder="예: IT 스타트업, 제조업, 금융권"
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>경력 (Experience) *</label>
              <select
                style={styles.select}
                value={formData.experience}
                onChange={(e) => handleChange("experience", e.target.value)}
              >
                <option value="Junior (1-3년)">주니어 (1~3년)</option>
                <option value="Middle (4-7년)">미들 (4~7년)</option>
                <option value="Senior (8년+)">시니어 (8년 이상)</option>
                <option value="Manager/Lead">매니저/팀장</option>
                <option value="Student/Newbie">취준생/신입</option>
              </select>
            </div>
          </div>

          <div style={styles.sectionTitle}>스킬 수준 (Current Skills)</div>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>디지털/데이터 친숙도</label>
              <select
                style={styles.select}
                value={formData.skillDigital}
                onChange={(e) => handleChange("skillDigital", e.target.value)}
              >
                <option value="Low">낮음 (엑셀 기초 정도)</option>
                <option value="Normal">보통 (업무 툴 원활)</option>
                <option value="High">높음 (새로운 툴 습득 빠름)</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>프로그래밍 경험</label>
              <select
                style={styles.select}
                value={formData.skillProgramming}
                onChange={(e) => handleChange("skillProgramming", e.target.value)}
              >
                <option value="None">없음 (No Code)</option>
                <option value="Basic">기초 (HTML/SQL 조금)</option>
                <option value="Intermediate">중급 (스크립트 작성 가능)</option>
                <option value="Advanced">고급 (전문 개발자)</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>AI 사용 경험</label>
              <select
                style={styles.select}
                value={formData.skillAI}
                onChange={(e) => handleChange("skillAI", e.target.value)}
              >
                <option value="None">없음</option>
                <option value="Beginner">초급 (ChatGPT 질문 정도)</option>
                <option value="Intermediate">중급 (프롬프트 튜닝/API 사용)</option>
              </select>
            </div>
          </div>

          <div style={styles.sectionTitle}>학습 환경 & 목표 (Goals)</div>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>총 학습 기간</label>
              <input
                style={styles.input}
                placeholder="예: 4주, 2개월"
                value={formData.durationTotal}
                onChange={(e) => handleChange("durationTotal", e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>주당 학습 시간</label>
              <input
                style={styles.input}
                placeholder="예: 3시간, 주말 5시간"
                value={formData.durationWeekly}
                onChange={(e) => handleChange("durationWeekly", e.target.value)}
              />
            </div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>학습 목표 (구체적으로) *</label>
              <textarea
                style={styles.textarea}
                placeholder="예: 업무 자동화로 야근 줄이기, 데이터 기반 의사결정 역량 키우기, 사내 챗봇 구축해보기 등"
                value={formData.goals}
                onChange={(e) => handleChange("goals", e.target.value)}
              />
            </div>
            <div style={styles.fullWidth}>
              <label style={styles.label}>기타 제약/요청사항</label>
              <input
                style={styles.input}
                placeholder="예: 유료 툴 사용 불가, 한국어 자료 선호, 비개발자 눈높이"
                value={formData.constraints}
                onChange={(e) => handleChange("constraints", e.target.value)}
              />
            </div>
          </div>

          <button
            style={{
              ...styles.button,
              ...(formData.role === "" ? styles.buttonDisabled : {}),
            }}
            onClick={generateRoadmap}
            disabled={formData.role === ""}
          >
            로드맵 생성하기 (Generate Roadmap)
          </button>
        </div>
      )}

      {loading && (
        <div style={styles.card}>
          <div style={styles.loader}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤖</div>
            <h3 style={{ color: "#2563eb" }}>AI가 커리큘럼을 설계하고 있습니다...</h3>
            <p>직무 특성과 학습 목표를 분석 중입니다. 잠시만 기다려주세요.</p>
          </div>
        </div>
      )}

      {result && !loading && (
        <div style={styles.card}>
          <div style={styles.resultHeader}>
            <h2 style={{ margin: 0, color: "#2563eb" }}>🎓 맞춤형 학습 로드맵</h2>
            <button style={styles.backButton} onClick={handleReset}>
              ↺ 다시 만들기
            </button>
          </div>
          <SimpleMarkdown content={result} />
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
