document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // helper: derive 1-2 initials from an email/local-part
  function getInitialsFromEmail(email) {
    const local = email.split("@")[0];
    const parts = local.split(/[\.\-_]/).filter(Boolean);
    if (parts.length === 0) return local.slice(0,2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and lists
      activitiesList.innerHTML = "";
      // reset select options (keep the placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // build participants HTML
        let participantsHTML = `<div class="participants" aria-label="Participants for ${name}"><h5>Participants</h5>`;
        if (details.participants && details.participants.length > 0) {
          participantsHTML += "<ul>";
          details.participants.forEach(p => {
            const initials = getInitialsFromEmail(p);
            participantsHTML += `
              <li>
                <span class="participant-avatar" title="${p}">${initials}</span>
                <span class="participant-name">${p}</span>
                <button class="delete-participant" data-activity="${name}" data-email="${p}" aria-label="Remove ${p}">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" fill="#a00"/></svg>
                </button>
              </li>`;
          });
          participantsHTML += "</ul>";
        } else {
          participantsHTML += `<ul><li class="empty">No one has signed up yet — be the first!</li></ul>`;
        }
        participantsHTML += "</div>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // attach delete handlers for this card's buttons
        activityCard.querySelectorAll('.delete-participant').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const activity = btn.getAttribute('data-activity');
            const email = btn.getAttribute('data-email');
            if (!activity || !email) return;
            if (!confirm(`Remove ${email} from ${activity}?`)) return;

            try {
              const res = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, {
                method: 'DELETE'
              });
              const data = await res.json();
              if (res.ok) {
                messageDiv.textContent = data.message || 'Participant removed.';
                messageDiv.className = 'success';
                // refresh list
                await fetchActivities();
              } else {
                messageDiv.textContent = data.detail || 'Failed to remove participant.';
                messageDiv.className = 'error';
              }
            } catch (err) {
              messageDiv.textContent = 'Error removing participant.';
              messageDiv.className = 'error';
              console.error('Error unregistering:', err);
            }
            messageDiv.classList.remove('hidden');
            setTimeout(() => messageDiv.classList.add('hidden'), 5000);
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const submitButton = signupForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // refresh activities so participants and availability update
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
    if (submitButton) submitButton.disabled = false;
  });

  // Initialize app
  fetchActivities();
});
