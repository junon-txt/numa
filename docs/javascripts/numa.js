document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector(".md-nav");
    let timeout;
    
    const hideNav = () => {
        nav.style.transform = "translateX(-100%)";
        nav.style.transition = "transform 0.3s ease-in-out";
    };

    const showNav = () => {
        nav.style.transform = "translateX(0)";
        nav.style.transition = "transform 0.3s ease-in-out";
    };

    const resetTimeout = () => {
        clearTimeout(timeout);
        showNav();
        timeout = setTimeout(hideNav, 3000);
    };

    document.addEventListener("mousemove", resetTimeout);
    document.addEventListener("keydown", resetTimeout);

    nav.addEventListener("mouseenter", showNav);

    nav.addEventListener("mouseleave", resetTimeout);

    timeout = setTimeout(hideNav, 3000);
});
