document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.getElementById('gallery');
    const satelliteFilters = document.getElementById('satelliteFilters');
    const searchInput = document.getElementById('searchInput');
    const dateArchive = document.getElementById('dateArchive');
    const eventArchive = document.getElementById('eventArchive');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const captionText = document.getElementById('caption');
    const closeBtn = document.querySelector('.close');

    let allImages = [];
    let filteredImages = [];
    let renderedCount = 0;
    const BATCH_SIZE = 24;
    let isLoading = false;
    let currentSatelliteFilter = 'all';
    let currentDateFilter = 'all'; // 'all' or 'YYYY-MM'
    let currentEventFilter = 'all';

    // Intersection Observer for Infinite Scroll
    const observerOptions = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !isLoading && renderedCount < filteredImages.length) {
                renderBatch();
            }
        });
    }, observerOptions);

    // Create sentinel element
    const sentinel = document.createElement('div');
    sentinel.className = 'sentinel';
    sentinel.innerHTML = '<div class="loading-spinner"></div>';

    // Fetch data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allImages = data;
            // Sort by date descending
            allImages.sort((a, b) => new Date(b.date) - new Date(a.date));

            initializeFilters();
            initializeArchive();
            initializeEventArchive();
            renderGallery();
        })
        .catch(error => {
            console.error('Error loading gallery data:', error);
            gallery.innerHTML = '<div class="error">无法加载数据，请确保 data.json 存在。</div>';
        });

    function initializeFilters() {
        const satellites = new Set(allImages.map(img => img.satellite));

        satellites.forEach(sat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.filter = sat;
            btn.textContent = sat;
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentSatelliteFilter = sat;
                renderGallery();
            });
            satelliteFilters.appendChild(btn);
        });

        // "All" button logic
        const allBtn = document.querySelector('[data-filter="all"]');
        allBtn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            allBtn.classList.add('active');
            currentSatelliteFilter = 'all';
            renderGallery();
        });
    }

    function initializeArchive() {
        const dateCounts = {};
        allImages.forEach(img => {
            const dateObj = new Date(img.date);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getUTCFullYear();
                const month = dateObj.getUTCMonth() + 1;
                const key = `${year}-${month}`; // Internal key
                const label = `${year}年${month}月`; // Display label

                if (!dateCounts[key]) {
                    dateCounts[key] = { label: label, count: 0, sortKey: year * 100 + month };
                }
                dateCounts[key].count++;
            }
        });

        const sortedDates = Object.entries(dateCounts).sort((a, b) => b[1].sortKey - a[1].sortKey);

        // Add "All Dates" option
        const allLi = document.createElement('li');
        const allLink = document.createElement('a');
        allLink.innerHTML = `<span>全部日期</span><span class="archive-count">【${allImages.length}】</span>`;
        allLink.classList.add('active');
        allLink.addEventListener('click', () => {
            document.querySelectorAll('#dateArchive a').forEach(a => a.classList.remove('active'));
            allLink.classList.add('active');
            currentDateFilter = 'all';
            renderGallery();
        });
        allLi.appendChild(allLink);
        dateArchive.appendChild(allLi);

        sortedDates.forEach(([key, data]) => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.innerHTML = `<span>${data.label}</span><span class="archive-count">【${data.count}】</span>`;

            link.addEventListener('click', () => {
                document.querySelectorAll('#dateArchive a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
                currentDateFilter = key;
                renderGallery();
            });

            li.appendChild(link);
            dateArchive.appendChild(li);
        });
    }

    function initializeEventArchive() {
        const eventCounts = {};
        allImages.forEach(img => {
            const eventName = img.event || 'General';
            const label = eventName === 'General' ? '常规(General)' : eventName;

            if (!eventCounts[eventName]) {
                eventCounts[eventName] = { label: label, count: 0 };
            }
            eventCounts[eventName].count++;
        });

        // Sort events: General last, others alphabetical or by count
        const sortedEvents = Object.entries(eventCounts).sort((a, b) => {
            if (a[0] === 'General') return 1;
            if (b[0] === 'General') return -1;
            return b[1].count - a[1].count; // Sort by count descending
        });

        // Add "All Events" option
        const allLi = document.createElement('li');
        const allLink = document.createElement('a');
        allLink.innerHTML = `<span>全部事件</span><span class="archive-count">【${allImages.length}】</span>`;
        allLink.classList.add('active');
        allLink.addEventListener('click', () => {
            document.querySelectorAll('#eventArchive a').forEach(a => a.classList.remove('active'));
            allLink.classList.add('active');
            currentEventFilter = 'all';
            renderGallery();
        });
        allLi.appendChild(allLink);
        eventArchive.appendChild(allLi);

        sortedEvents.forEach(([key, data]) => {
            const li = document.createElement('li');
            const link = document.createElement('a');
            link.innerHTML = `<span>${data.label}</span> <span class="archive-count">【${data.count}】</span>`;

            link.addEventListener('click', () => {
                document.querySelectorAll('#eventArchive a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');
                currentEventFilter = key;
                renderGallery();
            });

            li.appendChild(link);
            eventArchive.appendChild(li);
        });
    }

    function renderGallery() {
        const searchTerm = searchInput.value.toLowerCase();

        // Apply Filters
        filteredImages = allImages.filter(img => {
            // Satellite Filter
            const matchesSat = currentSatelliteFilter === 'all' || img.satellite === currentSatelliteFilter;

            // Date Filter
            let matchesDate = true;
            if (currentDateFilter !== 'all') {
                const dateObj = new Date(img.date);
                if (!isNaN(dateObj.getTime())) {
                    const year = dateObj.getUTCFullYear();
                    const month = dateObj.getUTCMonth() + 1;
                    const key = `${year}-${month}`;
                    matchesDate = key === currentDateFilter;
                } else {
                    matchesDate = false;
                }
            }

            // Event Filter
            const matchesEvent = currentEventFilter === 'all' || (img.event || 'General') === currentEventFilter;

            // Search Filter
            const matchesSearch = img.satellite.toLowerCase().includes(searchTerm) ||
                img.event.toLowerCase().includes(searchTerm) ||
                img.date.includes(searchTerm);

            return matchesSat && matchesDate && matchesEvent && matchesSearch;
        });

        // Reset Gallery
        gallery.innerHTML = '';
        renderedCount = 0;

        // Update stats
        const statsDiv = document.getElementById('gallery-stats');
        if (statsDiv) {
            statsDiv.textContent = `显示 ${filteredImages.length} 张图像`;
        }

        if (filteredImages.length === 0) {
            gallery.innerHTML = '<div class="no-results">没有找到相关图片</div>';
            return;
        }

        gallery.classList.remove('gallery-grid');
        gallery.style.display = 'block';

        // Start loading first batch
        renderBatch();

        // Append sentinel for infinite scroll
        gallery.appendChild(sentinel);
        observer.observe(sentinel);
    }

    function renderBatch() {
        if (isLoading) return;
        isLoading = true;

        const nextBatch = filteredImages.slice(renderedCount, renderedCount + BATCH_SIZE);
        if (nextBatch.length === 0) {
            isLoading = false;
            // Hide sentinel if no more items
            if (sentinel.parentNode) {
                observer.unobserve(sentinel);
                sentinel.style.display = 'none';
            }
            return;
        }

        // Group images by Year-Month
        const groups = {};
        nextBatch.forEach(img => {
            const dateObj = new Date(img.date);
            let key = 'Unknown Date';
            let sortKey = 0;

            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getUTCFullYear();
                const month = dateObj.getUTCMonth() + 1;
                key = `${year}年 ${month}月`;
                sortKey = year * 100 + month;
            }

            if (!groups[key]) {
                groups[key] = {
                    title: key,
                    sortKey: sortKey,
                    items: []
                };
            }
            groups[key].items.push(img);
        });

        const sortedGroups = Object.values(groups).sort((a, b) => b.sortKey - a.sortKey);

        // Check if we need to merge with the last existing group
        const lastHeader = gallery.querySelector('.date-group-header:last-of-type');
        const lastGrid = gallery.querySelector('.gallery-grid:last-of-type');

        let startIndex = 0;
        if (lastHeader && lastGrid && sortedGroups.length > 0) {
            if (lastHeader.textContent === sortedGroups[0].title) {
                // Merge first group
                sortedGroups[0].items.forEach(img => {
                    const card = createCard(img);
                    lastGrid.appendChild(card);
                });
                startIndex = 1; // Skip first group as it's merged
            }
        }

        // Render remaining groups
        for (let i = startIndex; i < sortedGroups.length; i++) {
            const group = sortedGroups[i];

            const header = document.createElement('h2');
            header.className = 'date-group-header';
            header.textContent = group.title;

            // Safe insertion
            if (sentinel.parentNode === gallery) {
                gallery.insertBefore(header, sentinel);
            } else {
                gallery.appendChild(header);
            }

            const grid = document.createElement('div');
            grid.className = 'gallery-grid';

            group.items.forEach(img => {
                const card = createCard(img);
                grid.appendChild(card);
            });

            if (sentinel.parentNode === gallery) {
                gallery.insertBefore(grid, sentinel);
            } else {
                gallery.appendChild(grid);
            }
        }

        renderedCount += nextBatch.length;
        isLoading = false;

        // Re-check sentinel visibility
        if (renderedCount < filteredImages.length) {
            if (sentinel.parentNode !== gallery) {
                gallery.appendChild(sentinel);
            }
            sentinel.style.display = 'block';
            observer.observe(sentinel);
        } else {
            sentinel.style.display = 'none';
            observer.unobserve(sentinel);
        }
    }

    searchInput.addEventListener('input', () => {
        renderGallery();
    });

    function createCard(img) {
        const card = document.createElement('div');
        card.className = 'card';

        // Format date nicely in UTC
        const dateObj = new Date(img.date);
        const dateStr = isNaN(dateObj.getTime()) ? img.date :
            dateObj.getUTCFullYear() + '/' +
            String(dateObj.getUTCMonth() + 1).padStart(2, '0') + '/' +
            String(dateObj.getUTCDate()).padStart(2, '0') + ' ' +
            String(dateObj.getUTCHours()).padStart(2, '0') + ':' +
            String(dateObj.getUTCMinutes()).padStart(2, '0') + ' UTC';

        card.innerHTML = `
            <div class="card-image-wrapper">
                <img src="${img.path}" alt="${img.satellite} - ${img.event}" class="card-image" loading="lazy">
            </div>
            <div class="card-info">
                <h3 class="card-title">${img.satellite}</h3>
                <div class="card-meta">
                    <span class="event-tag">${img.event}</span>
                    <span class="date">${dateStr}</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            openLightbox(img);
        });

        return card;
    }

    // Sidebar Interaction Logic
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mainLayout = document.querySelector('.main-layout');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // PC Toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainLayout.classList.toggle('sidebar-hidden');
            // Update icon direction
            const icon = sidebarToggle.querySelector('.icon');
            if (mainLayout.classList.contains('sidebar-hidden')) {
                icon.style.transform = 'rotate(180deg)';
                sidebarToggle.title = "显示侧边栏";
            } else {
                icon.style.transform = 'rotate(0deg)';
                sidebarToggle.title = "隐藏侧边栏";
            }
        });
    }

    // Mobile Toggle
    function toggleMobileSidebar() {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', toggleMobileSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleMobileSidebar);
    }

    // Close mobile sidebar when clicking a link
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            e.target.closest('.archive-list a') &&
            sidebar.classList.contains('active')) {
            toggleMobileSidebar();
        }
    });

    // Back to Top Logic
    const backToTopBtn = document.getElementById('backToTop');

    if (backToTopBtn) {
        window.onscroll = function () {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                backToTopBtn.style.display = "block";
            } else {
                backToTopBtn.style.display = "none";
            }
        };

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Lightbox
    function openLightbox(img) {
        lightbox.style.display = 'block';
        lightboxImg.src = img.path;
        captionText.innerHTML = `<strong>${img.satellite}</strong><br>${img.event} - ${img.date}`;
    }

    closeBtn.onclick = function () {
        lightbox.style.display = 'none';
    }

    window.onclick = function (event) {
        if (event.target == lightbox) {
            lightbox.style.display = 'none';
        }
    }
});
