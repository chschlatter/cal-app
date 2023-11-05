$(document).ready(function () {
  $("#login-btn").click(login);

  $(".form-control").on("input", function () {
    $(this).removeClass("is-invalid");
    $("#message-feedback").text("");
  });

  $(".form-control").on("keypress", function (e) {
    if (e.which == 13) {
      // ENTER key
      login(e);
    }
  });

  $("#username-input").on("input", function () {
    if ($(this).val() == "admin") {
      $("#password-block").removeClass("d-none");
    } else {
      $("#password-block").addClass("d-none");
    }
  });
});

function login(e) {
  const form_data = new FormData(document.getElementById("login-form"));
  const credentials = Object.fromEntries(form_data);
  console.log(credentials);

  $(":button").attr("disabled", true);
  $("#login-btn").html("Loging in ...");

  $.ajax({
    url: "/api/users/login",
    // dataType: 'json', --> empty body
    contentType: "application/json; charset=utf-8",
    type: "post",
    data: JSON.stringify(credentials),
  })
    .done(function (response) {
      console.log(response);
      window.location.assign("/");
    })
    .fail(function (xhr) {
      try {
        console.log(xhr.responseText);
        const error_obj = JSON.parse(xhr.responseText);
        console.log(error_obj);

        if (error_obj.message) {
          if (error_obj.code && typeof error_obj.code == "string") {
            switch (error_obj.code) {
              case "auth-010":
                $("#password-feedback").text(error_obj.message);
                $("#password-input").addClass("is-invalid");
                break;
              case "auth-011":
                $("#username-feedback").text(error_obj.message);
                $("#username-input").addClass("is-invalid");
                break;
              case "auth-012":
                $("#password-block").removeClass("d-none");
                $("#message-feedback").text(error_obj.message);
                break;
              default:
                $("#message-feedback").text(error_obj.message);
            }
          }
        }
      } finally {
        $(":button").attr("disabled", false);
        $("#login-btn").html("Login");
      }
    })
    .always(function () {
      $(":button").attr("disabled", false);
      $("#login-btn").html("Login");
    });
}
