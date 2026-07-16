const defaults = {
  mission: "Get the Plasma CNC producing saleable products as quickly as possible.",
  priorities: [
    { text: "Rebuild the simple THC controller", done: false },
    { text: "Perform a plasma test cut and record voltage versus height", done: false },
    { text: "Register Aurora ForgeWorks with DTI", done: false }
  ],
  roiTask: "Restore dependable plasma cut quality so production can begin.",
  nextMilestone: "Complete a repeatable saleable test cut.",
  blockers: [
    "Plasma cut quality is not yet dependable",
    "Actual arc-voltage-to-height relationship is not yet measured"
  ],
  recommendation: "Keep the scope narrow: finish the THC, run controlled test cuts, record results, and use the evidence to choose the next adjustment.",
  milestones: [
    { date: "2026-07-16", text: "Aurora OS repository and GitHub access established" },
    { date: "2026-07-16", text: "Executive dashboard selected as the first Aurora OS deliverable" }
  ],
  lastPmoReview: null,
  samEndpoint: "",
  samToken: ""
};

const key = "aurora-dashboard-v03";
let state = load();

const $ = (selector) => document.querySelector(selector);
const mission = $("#mission");
const priorities = $("#priorities");
const roiTask = $("#roiTask");
const nextMilestone = $("#nextMilestone");
const blockers = $("#blockers");
const recommendation = $("#recommendation");
const milestoneLog = $("#milestoneLog");
const pmoReport = $("#pmoReport");
const agentStatus = $("#agentStatus");
const samEndpoint = $("#samEndpoint");
const samToken = $("#samToken");
const samMessage = $("#samMessage");
const askSamBtn = $("#askSamBtn");

function load() {
  try {
    const previous = JSON.parse(localStorage.getItem("aurora-dashboard-v02")) || {};
    const current = JSON.parse(localStorage.getItem(key)) || {};
    return { ...structuredClone(defaults), ...previous, ...current };
  } catch {
    return structuredClone(defaults);
  }
}

function save() {
  localStorage.setItem(key, JSON.stringify(state));
}

function render() {
  mission.textContent = state.mission;
  roiTask.value = state.roiTask;
  nextMilestone.value = state.nextMilestone;
  recommendation.value = state.recommendation;
  samEndpoint.value = state.samEndpoint || "";
  samToken.value = state.samToken || "";
  renderPriorities();
  renderBlockers();
  renderMilestones();
  renderAgentStatus();
}

function renderPriorities() {
  priorities.innerHTML = "";
  state.priorities.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = `priority-item${item.done ? " done" : ""}`;
    row.innerHTML = `
      <input type="checkbox" ${item.done ? "checked" : ""} aria-label="Mark priority complete">
      <input type="text" value="${escapeHtml(item.text)}" aria-label="Priority">
      <button class="icon-button" aria-label="Delete priority">×</button>`;
    const [check, input, remove] = row.children;
    check.addEventListener("change", () => { item.done = check.checked; save(); renderPriorities(); renderAgentStatus(); });
    input.addEventListener("input", () => { item.text = input.value; save(); });
    remove.addEventListener("click", () => { state.priorities.splice(index, 1); save(); renderPriorities(); renderAgentStatus(); });
    priorities.appendChild(row);
  });
}

function renderBlockers() {
  blockers.innerHTML = "";
  state.blockers.forEach((text, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<input type="text" value="${escapeHtml(text)}" aria-label="Blocker"><button class="icon-button" aria-label="Delete blocker">×</button>`;
    li.children[0].addEventListener("input", (event) => { state.blockers[index] = event.target.value; save(); });
    li.children[1].addEventListener("click", () => { state.blockers.splice(index, 1); save(); renderBlockers(); renderAgentStatus(); });
    blockers.appendChild(li);
  });
}

function renderMilestones() {
  milestoneLog.innerHTML = "";
  [...state.milestones].reverse().forEach((item, reverseIndex) => {
    const index = state.milestones.length - 1 - reverseIndex;
    const row = document.createElement("div");
    row.className = "milestone";
    row.innerHTML = `<time>${item.date}</time><input type="text" value="${escapeHtml(item.text)}" aria-label="Milestone"><button class="icon-button" aria-label="Delete milestone">×</button>`;
    row.children[1].addEventListener("input", (event) => { state.milestones[index].text = event.target.value; save(); });
    row.children[2].addEventListener("click", () => { state.milestones.splice(index, 1); save(); renderMilestones(); });
    milestoneLog.appendChild(row);
  });
}

function renderAgentStatus() {
  const active = state.priorities.filter((item) => !item.done && item.text.trim()).length;
  const blockerCount = state.blockers.filter((item) => item.trim()).length;
  agentStatus.className = "status-badge";
  if (blockerCount > 0 || active > 3) {
    agentStatus.textContent = "Attention";
    agentStatus.classList.add("attention");
  } else if (active > 0) {
    agentStatus.textContent = "Focused";
    agentStatus.classList.add("clear");
  } else {
    agentStatus.textContent = "Needs plan";
  }
}

function dashboardPayload() {
  return {
    mission: state.mission,
    priorities: state.priorities,
    highest_roi_task: state.roiTask,
    next_milestone: state.nextMilestone,
    blockers: state.blockers,
    recent_milestones: state.milestones.slice(-10),
    current_recommendation: state.recommendation,
    reviewed_at: new Date().toISOString()
  };
}

async function askSam() {
  const endpoint = state.samEndpoint.trim().replace(/\/$/, "");
  const token = state.samToken.trim();
  if (!endpoint || !token) {
    showReport("Connection required", ["Open Sam connection and enter the Worker URL and dashboard access token."]);
    return;
  }

  askSamBtn.disabled = true;
  askSamBtn.textContent = "Sam is reviewing…";
  agentStatus.textContent = "Reviewing";
  agentStatus.className = "status-badge";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ dashboard: dashboardPayload(), message: samMessage.value.trim() })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.review) throw new Error(data.error || `Request failed (${response.status})`);

    const review = data.review;
    state.recommendation = review.recommended_next_action;
    state.lastPmoReview = new Date().toISOString();
    recommendation.value = state.recommendation;
    save();

    const findings = [review.summary, review.reasoning];
    if (review.suggested_priority_changes?.length) findings.push(`Priority suggestions: ${review.suggested_priority_changes.join(" · ")}`);
    if (review.blockers_to_escalate?.length) findings.push(`Escalate: ${review.blockers_to_escalate.join(" · ")}`);
    if (review.milestone_to_record) findings.push(`Milestone candidate: ${review.milestone_to_record}`);
    showReport("Sam's PMO review", findings.filter(Boolean));
    setStatusFromReview(review.status);
  } catch (error) {
    showReport("Sam connection failed", [error.message, "The dashboard remains usable. Run the local review as a fallback."]);
    renderAgentStatus();
  } finally {
    askSamBtn.disabled = false;
    askSamBtn.textContent = "Ask Sam";
  }
}

function setStatusFromReview(status) {
  agentStatus.className = "status-badge";
  if (status === "focused") {
    agentStatus.textContent = "Focused";
    agentStatus.classList.add("clear");
  } else if (status === "attention") {
    agentStatus.textContent = "Attention";
    agentStatus.classList.add("attention");
  } else {
    agentStatus.textContent = "Needs plan";
  }
}

function runPmoReview() {
  const findings = [];
  const missionText = state.mission.trim();
  const activePriorities = state.priorities.filter((item) => !item.done && item.text.trim());
  const completedPriorities = state.priorities.filter((item) => item.done && item.text.trim());
  const activeBlockers = state.blockers.filter((item) => item.trim());
  if (!missionText) findings.push("Define one clear mission for today.");
  if (activePriorities.length === 0) findings.push("Choose the single next action that advances the mission.");
  if (activePriorities.length > 3) findings.push(`Reduce ${activePriorities.length} active priorities to the three that matter most.`);
  if (!state.roiTask.trim()) findings.push("Identify the highest-ROI task before adding more work.");
  if (!state.nextMilestone.trim()) findings.push("Define a measurable next milestone.");
  if (activeBlockers.length > 0) findings.push(`Resolve or assign an action for ${activeBlockers.length} blocker${activeBlockers.length === 1 ? "" : "s"}.`);
  if (completedPriorities.length > 0) findings.push(`Record results from ${completedPriorities.length} completed priorit${completedPriorities.length === 1 ? "y" : "ies"}, then remove them.`);
  if (findings.length === 0) findings.push("The dashboard is focused. Execute the first priority and avoid adding scope.");

  const nextAction = activeBlockers.length
    ? `Clear the most limiting blocker: ${activeBlockers[0]}.`
    : activePriorities[0]
      ? `Execute the first priority: ${activePriorities[0].text.trim()}.`
      : "Set one concrete priority and begin it.";

  state.recommendation = `${nextAction} Do not add new initiatives until the next milestone is advanced.`;
  state.lastPmoReview = new Date().toISOString();
  recommendation.value = state.recommendation;
  save();
  showReport("Local PMO review", findings);
  renderAgentStatus();
}

function showReport(title, items) {
  pmoReport.innerHTML = `<strong>${escapeHtml(title)}</strong><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  pmoReport.classList.add("visible");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

mission.addEventListener("input", () => { state.mission = mission.textContent.trim(); save(); });
roiTask.addEventListener("input", () => { state.roiTask = roiTask.value; save(); });
nextMilestone.addEventListener("input", () => { state.nextMilestone = nextMilestone.value; save(); });
recommendation.addEventListener("input", () => { state.recommendation = recommendation.value; save(); });
samEndpoint.addEventListener("input", () => { state.samEndpoint = samEndpoint.value; save(); });
samToken.addEventListener("input", () => { state.samToken = samToken.value; save(); });

askSamBtn.addEventListener("click", askSam);
$("#runPmoBtn").addEventListener("click", runPmoReview);
$("#addPriorityBtn").addEventListener("click", () => {
  if (state.priorities.length >= 5) return alert("Keep the active list focused: maximum five priorities.");
  state.priorities.push({ text: "New priority", done: false }); save(); renderPriorities(); renderAgentStatus();
});
$("#addBlockerBtn").addEventListener("click", () => { state.blockers.push("New blocker"); save(); renderBlockers(); renderAgentStatus(); });
$("#addMilestoneBtn").addEventListener("click", () => {
  state.milestones.push({ date: new Date().toISOString().slice(0, 10), text: "New milestone" }); save(); renderMilestones();
});
$("#resetBtn").addEventListener("click", () => {
  if (!confirm("Reset the dashboard to its original data?")) return;
  const connection = { samEndpoint: state.samEndpoint, samToken: state.samToken };
  state = { ...structuredClone(defaults), ...connection };
  save();
  pmoReport.classList.remove("visible");
  render();
});

render();
