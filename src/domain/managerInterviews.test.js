import test from "node:test";
import assert from "node:assert/strict";
import {
  buildManagerInterviewContext,
  getManagerInterviewChoices,
  MANAGER_INTERVIEW_ANSWER_KEYS
} from "./managerInterviews.js";

const match = (overrides = {}) => ({
  id: "match-1",
  home_club_id: "club-a",
  away_club_id: "club-b",
  home_score: 2,
  away_score: 1,
  round_number: 8,
  ...overrides
});

const clubA = { id: "club-a", nome: "União", cidade: "Caçapava" };
const clubB = { id: "club-b", nome: "Rivais", cidade: "Taubaté" };

test("classifica uma partida comum como campeonato e contextualiza a pergunta", () => {
  const context = buildManagerInterviewContext({
    match: match(),
    clubId: "club-a",
    homeClub: clubA,
    awayClub: clubB,
    competitionName: "Liga Nacional",
    maxRound: 20
  });

  assert.equal(context.scenario, "campeonato");
  assert.match(context.question, /Liga Nacional|campeonato/i);
  assert.equal(context.outcome, "win");
});

test("reconhece clássico regional pela cidade dos clubes", () => {
  const context = buildManagerInterviewContext({
    match: match(),
    clubId: "club-a",
    homeClub: clubA,
    awayClub: { ...clubB, cidade: "CAÇAPAVA " },
    maxRound: 20
  });

  assert.equal(context.scenario, "classico");
  assert.match(context.question, /clássico/i);
});

test("prioriza competição de copa quando não é clássico", () => {
  const context = buildManagerInterviewContext({
    match: match({ round_number: 5 }),
    clubId: "club-a",
    homeClub: clubA,
    awayClub: clubB,
    competitionName: "Copa Nacional",
    maxRound: 5
  });

  assert.equal(context.scenario, "copa");
});

test("identifica disputa pelo título somente com proximidade na tabela", () => {
  const standings = [
    { club_id: "club-b", points: 50, wins: 15, goal_difference: 20 },
    { club_id: "club-a", points: 46, wins: 14, goal_difference: 18 },
    { club_id: "club-c", points: 40, wins: 12, goal_difference: 8 },
    { club_id: "club-d", points: 30, wins: 9, goal_difference: 0 }
  ];
  const context = buildManagerInterviewContext({
    match: match({ round_number: 19 }),
    clubId: "club-a",
    homeClub: clubA,
    awayClub: clubB,
    competitionName: "Liga Nacional",
    standings,
    maxRound: 20
  });

  assert.equal(context.scenario, "titulo");
  assert.match(context.question, /título/i);
});

test("não chama de disputa pelo título um segundo colocado distante", () => {
  const standings = [
    { club_id: "club-b", points: 60, wins: 18, goal_difference: 25 },
    { club_id: "club-a", points: 45, wins: 13, goal_difference: 10 },
    { club_id: "club-c", points: 40, wins: 11, goal_difference: 5 },
    { club_id: "club-d", points: 30, wins: 8, goal_difference: -2 }
  ];
  const context = buildManagerInterviewContext({
    match: match({ round_number: 19 }),
    clubId: "club-a",
    homeClub: clubA,
    awayClub: clubB,
    standings,
    maxRound: 20
  });

  assert.equal(context.scenario, "decisiva");
});

test("identifica luta contra o rebaixamento quando a distância para a zona segura é pequena", () => {
  const standings = [
    { club_id: "club-a", points: 45 },
    { club_id: "club-b", points: 42 },
    { club_id: "club-c", points: 40 },
    { club_id: "club-d", points: 38 },
    { club_id: "club-e", points: 35 },
    { club_id: "club-f", points: 32 },
    { club_id: "club-g", points: 24 },
    { club_id: "club-h", points: 22 },
    { club_id: "club-i", points: 20 },
    { club_id: "club-j", points: 18 }
  ];
  const context = buildManagerInterviewContext({
    match: match({ round_number: 19 }),
    clubId: "club-i",
    homeClub: clubA,
    awayClub: clubB,
    standings,
    maxRound: 20
  });

  assert.equal(context.scenario, "rebaixamento");
});

test("calcula o resultado corretamente para o treinador do visitante", () => {
  const context = buildManagerInterviewContext({
    match: match({ home_score: 1, away_score: 3 }),
    clubId: "club-b",
    homeClub: clubA,
    awayClub: clubB,
    maxRound: 20
  });

  assert.equal(context.outcome, "win");
  assert.equal(context.score, "1 × 3");
});

test("sempre oferece exatamente três respostas válidas e contextualizadas", () => {
  const context = buildManagerInterviewContext({
    match: match(),
    clubId: "club-a",
    homeClub: clubA,
    awayClub: clubB,
    competitionName: "Liga Nacional",
    maxRound: 20
  });
  const choices = getManagerInterviewChoices(context);

  assert.equal(choices.length, 3);
  assert.deepEqual(choices.map(choice => choice.key), MANAGER_INTERVIEW_ANSWER_KEYS);
  assert.ok(choices.every(choice => choice.title && choice.text && choice.description));
  assert.ok(choices.every(choice =>
    Math.abs(choice.pressureDelta.fan) <= 15 &&
    Math.abs(choice.pressureDelta.board) <= 15 &&
    Math.abs(choice.reputationDelta.board) <= 10 &&
    Math.abs(choice.reputationDelta.players) <= 10 &&
    Math.abs(choice.reputationDelta.fans) <= 10
  ));
});

test("aplica ajuste extra de pressão em clássico e em derrota na luta contra o rebaixamento", () => {
  const classic = buildManagerInterviewContext({
    match: match({ home_score: 0, away_score: 1 }),
    clubId: "club-a",
    homeClub: clubA,
    awayClub: { ...clubB, cidade: "Caçapava" },
    maxRound: 20
  });
  const classicAssume = getManagerInterviewChoices(classic)[0];
  assert.equal(classicAssume.pressureDelta.fan, 0);

  const standings = [
    { club_id: "club-a", points: 45 }, { club_id: "club-b", points: 42 },
    { club_id: "club-c", points: 40 }, { club_id: "club-d", points: 38 },
    { club_id: "club-e", points: 35 }, { club_id: "club-f", points: 32 },
    { club_id: "club-g", points: 24 }, { club_id: "club-h", points: 22 },
    { club_id: "club-i", points: 20 }, { club_id: "club-j", points: 18 }
  ];
  const relegation = buildManagerInterviewContext({
    match: match({ home_score: 0, away_score: 1, round_number: 19 }),
    clubId: "club-i",
    homeClub: clubA,
    awayClub: clubB,
    standings,
    maxRound: 20
  });
  const relegationAssume = getManagerInterviewChoices(relegation)[0];
  assert.equal(relegation.scenario, "rebaixamento");
  assert.equal(relegationAssume.pressureDelta.board, -1);
});

test("retorna vazio para contexto inválido ou partida de outro clube", () => {
  assert.deepEqual(getManagerInterviewChoices(null), []);
  assert.equal(buildManagerInterviewContext({
    match: match(),
    clubId: "club-x",
    homeClub: clubA,
    awayClub: clubB
  }), null);
});
