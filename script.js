// ========== VARIABLES GLOBALES ==========
let panier = [];
let total = 0;
let favoris = [];
let comparaison = [];
let catalogueProduits = [];

// Rendre catalogueProduits accessible globalement
window.catalogueProduits = catalogueProduits;

// ========== INITIALISATION ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initialisation de la boutique...');
    chargerProduitsJSON();
    chargerPanier();
    chargerFavoris();
    chargerComparaison();
    initialiserRecherche();
    mettreAJourCompteurs();
    initMobileMenu();
});

// ========== CHARGEMENT DES PRODUITS ==========
async function chargerProduitsJSON() {
    try {
        // Essayer de charger depuis le localStorage d'abord (sauvegarde admin)
        const savedProduits = localStorage.getItem('catalogue_produits');
        if (savedProduits) {
            const data = JSON.parse(savedProduits);
            catalogueProduits = data.produits || [];
            window.catalogueProduits = catalogueProduits;
            console.log('Produits chargés depuis localStorage:', catalogueProduits.length);
            afficherProduits(catalogueProduits);
            cacherLoader();
            return;
        }

        // Sinon charger depuis le fichier JSON
        const response = await fetch('produits.json?' + Date.now());
        const data = await response.json();
        catalogueProduits = data.produits || [];
        window.catalogueProduits = catalogueProduits;
        console.log('Produits chargés depuis fichiers:', catalogueProduits.length);
        afficherProduits(catalogueProduits);
        cacherLoader();

    } catch (error) {
        console.error('Erreur chargement produits:', error);
        catalogueProduits = [];
        window.catalogueProduits = [];
        afficherProduits([]);
        afficherErreurChargement();
    }
}

function cacherLoader() {
    const loader = document.querySelector('.loader-container');
    if (loader) loader.style.display = 'none';
}

function afficherErreurChargement() {
    const conteneur = document.getElementById('liste-produits');
    if (conteneur) {
        conteneur.innerHTML = `
            <div class="erreur-chargement">
                <p>❌ Erreur de chargement des produits</p>
                <p>Vérifiez que des produits ont été ajoutés dans l'admin</p>
                <button onclick="location.reload()">🔄 Réessayer</button>
            </div>
        `;
    }
}

// ========== AFFICHAGE DES PRODUITS ==========
function afficherProduits(produitsAfficher) {
    const conteneur = document.getElementById('liste-produits');
    if (!conteneur) {
        console.error('Conteneur produits non trouvé');
        return;
    }

    conteneur.innerHTML = '';

    if (!produitsAfficher || produitsAfficher.length === 0) {
        conteneur.innerHTML = '<p class="aucun-produit">Aucun produit disponible pour le moment</p>';
        return;
    }

    produitsAfficher.forEach(produit => {
        const estFavori = favoris.some(f => f.id === produit.id);
        const estComparaison = comparaison.some(c => c.id === produit.id);

        // Image par défaut ou première image du tableau
        const imagePrincipale = produit.images && produit.images.length > 0
            ? produit.images[0]
            : 'https://via.placeholder.com/300';

        // Calcul du pourcentage de promo
        const pourcentagePromo = produit.promo && produit.prixOriginal > produit.prix
            ? Math.round((1 - produit.prix / produit.prixOriginal) * 100)
            : 0;

        const promo = produit.promo && pourcentagePromo > 0 ? `
            <span class="promotion">-${pourcentagePromo}%</span>
        ` : '';

        const prixAffichage = produit.promo && produit.prixOriginal > produit.prix ? `
            <p>
                <span class="prix-original">${produit.prixOriginal.toLocaleString()} FCFA</span>
                <span class="prix-promo">${produit.prix.toLocaleString()} FCFA</span>
            </p>
        ` : `<p>${produit.prix.toLocaleString()} FCFA</p>`;

        const etoiles = genererEtoiles(produit.note || 4.5);
        const stockClass = produit.stock < 5 ? 'stock-faible' : 'stock-normal';
        const stockTexte = produit.stock <= 0 ? 'Rupture de stock' : `${produit.stock} unités`;

        const carte = document.createElement('div');
        carte.className = 'produit';
        carte.dataset.id = produit.id;
        carte.dataset.categorie = produit.categorie;
        carte.dataset.promo = produit.promo;
        carte.dataset.nom = produit.nom.toLowerCase();

        // Mini-galerie d'images
        const galerieHTML = produit.images && produit.images.length > 1 ? `
            <div class="mini-galerie">
                ${produit.images.map((img, index) => `
                    <img src="${img}" alt="${produit.nom}" class="mini-img" 
                         onclick="ouvrirZoom('${img}'); event.stopPropagation()"
                         onerror="this.src='https://via.placeholder.com/60'">
                `).join('')}
            </div>
        ` : '';

        carte.innerHTML = `
            ${promo}
            <div class="produit-actions">
                <button class="btn-favori ${estFavori ? 'actif' : ''}" onclick="toggleFavori(${produit.id}); event.stopPropagation()">
                    ${estFavori ? '❤️' : '🤍'}
                </button>
                <button class="btn-comparaison ${estComparaison ? 'actif' : ''}" onclick="toggleComparaison(${produit.id}); event.stopPropagation()">
                    ${estComparaison ? '✓' : '⇄'}
                </button>
            </div>
            
            <div class="image-principale" onclick="ouvrirZoom('${imagePrincipale}')">
                <img src="${imagePrincipale}" alt="${produit.nom}" onerror="this.src='https://via.placeholder.com/300'">
            </div>
            
            ${galerieHTML}
            
            <h3>${produit.nom}</h3>
            <div class="note-produit" onclick="afficherDetailsProduit(${produit.id})">
                ${etoiles} <span class="nb-avis">(${produit.avis || 0} avis)</span>
            </div>
            <p class="description-produit">${produit.description || ''}</p>
            <p class="marque-produit">Marque: ${produit.marque || 'Générique'}</p>
            <p class="${stockClass}">Stock: ${stockTexte}</p>
            ${prixAffichage}
            <div class="boutons-produit">
                <button onclick="ajouterAuPanier('${produit.nom}', ${produit.prix}, '${imagePrincipale}', ${produit.id})"
                    ${produit.stock <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                    🛒 ${produit.stock <= 0 ? 'Rupture' : 'Ajouter'}
                </button>
                <button class="btn-details" onclick="afficherDetailsProduit(${produit.id})">
                    ℹ️ Détails
                </button>
            </div>
        `;
        conteneur.appendChild(carte);
    });
}

// ========== GESTION DES FAVORIS ==========
function toggleFavori(produitId) {
    const produit = catalogueProduits.find(p => p.id == produitId);
    if (!produit) return;

    const index = favoris.findIndex(f => f.id == produitId);

    if (index === -1) {
        favoris.push(produit);
        afficherNotification(`❤️ ${produit.nom} ajouté aux favoris`);
    } else {
        favoris.splice(index, 1);
        afficherNotification(`${produit.nom} retiré des favoris`);
    }

    sauvegarderFavoris();
    mettreAJourCompteurs();
    afficherProduits(catalogueProduits);
    afficherFavoris();
}

function sauvegarderFavoris() {
    localStorage.setItem('favoris', JSON.stringify(favoris));
}

function chargerFavoris() {
    const favorisSauvegardes = localStorage.getItem('favoris');
    if (favorisSauvegardes) {
        try {
            favoris = JSON.parse(favorisSauvegardes) || [];
        } catch (e) {
            favoris = [];
        }
    }
}

function afficherFavoris() {
    const conteneur = document.getElementById('liste-favoris');
    if (!conteneur) return;

    if (favoris.length === 0) {
        conteneur.innerHTML = '<p class="vide">Aucun favori pour le moment</p>';
        return;
    }

    conteneur.innerHTML = favoris.map(produit => {
        const image = produit.images?.[0] || 'https://via.placeholder.com/80';
        return `
            <div class="favori-item">
                <img src="${image}" alt="${produit.nom}" onclick="afficherDetailsProduit(${produit.id})" onerror="this.src='https://via.placeholder.com/80'">
                <div class="favori-info">
                    <h4>${produit.nom}</h4>
                    <p>${produit.prix.toLocaleString()} FCFA</p>
                    <button onclick="ajouterAuPanier('${produit.nom}', ${produit.prix}, '${image}', ${produit.id})">
                        Ajouter au panier
                    </button>
                </div>
                <button class="btn-supprimer-favori" onclick="toggleFavori(${produit.id})">✕</button>
            </div>
        `;
    }).join('');
}

// ========== GESTION DE LA COMPARAISON ==========
function chargerComparaison() {
    const comparaisonSauvegardee = localStorage.getItem('comparaison');
    if (comparaisonSauvegardee) {
        try {
            comparaison = JSON.parse(comparaisonSauvegardee) || [];
        } catch (e) {
            comparaison = [];
        }
    }
}

function toggleComparaison(produitId) {
    const produit = catalogueProduits.find(p => p.id == produitId);
    if (!produit) return;

    const index = comparaison.findIndex(c => c.id == produitId);

    if (index === -1) {
        if (comparaison.length >= 3) {
            afficherNotification("Vous ne pouvez comparer que 3 produits maximum", "error");
            return;
        }
        comparaison.push(produit);
        afficherNotification(`⇄ ${produit.nom} ajouté à la comparaison`);
    } else {
        comparaison.splice(index, 1);
        afficherNotification(`${produit.nom} retiré de la comparaison`);
    }

    sauvegarderComparaison();
    mettreAJourCompteurs();
    afficherProduits(catalogueProduits);
    afficherComparaison();
}

function sauvegarderComparaison() {
    localStorage.setItem('comparaison', JSON.stringify(comparaison));
}

function afficherComparaison() {
    const modal = document.getElementById('modalComparaison');
    const contenu = document.getElementById('comparaisonContenu');

    if (!modal || !contenu) return;

    if (comparaison.length === 0) {
        contenu.innerHTML = '<p class="vide">Sélectionnez des produits à comparer</p>';
        modal.style.display = "block";
        return;
    }

    let html = '<table class="table-comparaison">';

    // En-tête
    html += '<tr><th>Caractéristiques</th>';
    comparaison.forEach(prod => {
        const image = prod.images?.[0] || 'https://via.placeholder.com/100';
        html += `<th>
            <img src="${image}" alt="${prod.nom}" onerror="this.src='https://via.placeholder.com/100'">
            <h4>${prod.nom}</h4>
            <button class="btn-supprimer" onclick="toggleComparaison(${prod.id})">Retirer</button>
        </th>`;
    });
    html += '</tr>';

    // Lignes de comparaison
    const lignes = [
        { label: '💰 Prix', valeur: p => p.prix.toLocaleString() + ' FCFA' },
        { label: '⭐ Note', valeur: p => (p.note || 0) + '/5 (' + (p.avis || 0) + ' avis)' },
        { label: '📁 Catégorie', valeur: p => p.categorie === 'cosmetique' ? 'Cosmétique' : 'Électronique' },
        { label: '🏷️ Marque', valeur: p => p.marque || 'Générique' },
        { label: '📦 Stock', valeur: p => (p.stock || 0) + ' unités' },
        { label: '🚚 Livraison', valeur: p => p.livraison || '24h' }
    ];

    lignes.forEach(ligne => {
        html += '<tr>';
        html += `<td>${ligne.label}</td>`;
        comparaison.forEach(prod => {
            html += `<td>${ligne.valeur(prod)}</td>`;
        });
        html += '</tr>';
    });

    // Ligne action
    html += '<tr><td>🛒 Action</td>';
    comparaison.forEach(prod => {
        const image = prod.images?.[0] || '';
        html += `<td>
            <button onclick="ajouterAuPanier('${prod.nom}', ${prod.prix}, '${image}', ${prod.id})"
                ${prod.stock <= 0 ? 'disabled style="opacity:0.5;"' : ''}>
                ${prod.stock <= 0 ? 'Rupture' : 'Ajouter au panier'}
            </button>
        </td>`;
    });
    html += '</tr>';

    html += '</table>';
    contenu.innerHTML = html;
    modal.style.display = "block";
}

// ========== FONCTIONS UTILITAIRES ==========
function genererEtoiles(note) {
    note = note || 0;
    let etoiles = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= note) {
            etoiles += '★';
        } else if (i - 0.5 <= note) {
            etoiles += '½';
        } else {
            etoiles += '☆';
        }
    }
    return etoiles;
}

function ouvrirZoom(src) {
    const modal = document.getElementById('modalZoom');
    const imgZoom = document.getElementById('imgZoom');
    if (modal && imgZoom) {
        imgZoom.src = src;
        modal.style.display = "block";
    }
}

function fermerZoom() {
    const modal = document.getElementById('modalZoom');
    if (modal) {
        modal.style.display = "none";
    }
}

// ========== GESTION DU PANIER ==========
function ajouterAuPanier(nom, prix, imageUrl, produitId) {
    const produit = catalogueProduits.find(p => p.id == produitId);

    if (!produit || produit.stock <= 0) {
        afficherNotification("Produit en rupture de stock", "error");
        return;
    }

    const articleExistant = panier.find(article => article.nom === nom);

    if (articleExistant) {
        articleExistant.quantite += 1;
    } else {
        panier.push({
            nom,
            prix,
            image: imageUrl,
            quantite: 1,
            produitId: produitId
        });
    }

    produit.stock -= 1;
    total += prix;

    afficherPanier();
    sauvegarderPanier();
    afficherNotification(`✅ ${nom} ajouté au panier !`);
    suggererProduits(produitId);
}

function sauvegarderPanier() {
    localStorage.setItem('panier', JSON.stringify(panier));
    localStorage.setItem('total', total);
}

function chargerPanier() {
    const panierSauvegarde = localStorage.getItem('panier');
    const totalSauvegarde = localStorage.getItem('total');

    if (panierSauvegarde) {
        try {
            panier = JSON.parse(panierSauvegarde) || [];
            total = parseInt(totalSauvegarde) || 0;
            afficherPanier();
        } catch (e) {
            panier = [];
            total = 0;
        }
    }
}

function afficherPanier() {
    const liste = document.getElementById('articles-panier');
    const totalAffichage = document.getElementById('total');

    if (!liste || !totalAffichage) return;

    liste.innerHTML = '';

    if (panier.length === 0) {
        liste.innerHTML = '<p class="panier-vide">Votre panier est vide</p>';
        totalAffichage.textContent = '0';
        return;
    }

    panier.forEach((article) => {
        const li = document.createElement('li');
        li.className = 'item-panier';
        li.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <img src="${article.image}" alt="${article.nom}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;" onerror="this.src='https://via.placeholder.com/50'">
                <div>
                    <strong>${article.nom}</strong><br>
                    <span>${article.prix.toLocaleString()} FCFA</span>
                </div>
            </div>
            <div class="quantite-controles">
                <button class="btn-quantite" onclick="modifierQuantite('${article.nom}', -1)">-</button>
                <span>${article.quantite}</span>
                <button class="btn-quantite" onclick="modifierQuantite('${article.nom}', 1)">+</button>
                <button class="btn-supprimer" onclick="supprimerArticle('${article.nom}')">🗑️</button>
            </div>
        `;
        liste.appendChild(li);
    });

    totalAffichage.textContent = total.toLocaleString();
}

function modifierQuantite(nom, changement) {
    const article = panier.find(a => a.nom === nom);
    if (!article) return;

    const produit = catalogueProduits.find(p => p.id == article.produitId);

    if (changement > 0) {
        if (produit && produit.stock > 0) {
            article.quantite += 1;
            total += article.prix;
            produit.stock -= 1;
        } else {
            afficherNotification("Stock insuffisant", "error");
            return;
        }
    } else {
        if (article.quantite > 1) {
            article.quantite -= 1;
            total -= article.prix;
            if (produit) produit.stock += 1;
        } else {
            supprimerArticle(nom);
            return;
        }
    }

    sauvegarderPanier();
    afficherPanier();
    afficherProduits(catalogueProduits);
}

function supprimerArticle(nom) {
    const article = panier.find(a => a.nom === nom);
    if (!article) return;

    const produit = catalogueProduits.find(p => p.id == article.produitId);

    if (produit) {
        produit.stock += article.quantite;
    }

    total -= article.prix * article.quantite;
    panier = panier.filter(a => a.nom !== nom);

    sauvegarderPanier();
    afficherPanier();
    afficherProduits(catalogueProduits);
    afficherNotification(`🗑️ ${nom} retiré du panier`);
}

// ========== SUGGESTIONS ==========
function suggererProduits(produitId) {
    const produit = catalogueProduits.find(p => p.id == produitId);
    if (!produit) return;

    const suggestions = catalogueProduits
        .filter(p => p.id != produitId && p.categorie === produit.categorie)
        .slice(0, 3);

    const conteneur = document.getElementById('suggestions');
    if (!conteneur) return;

    if (suggestions.length > 0) {
        conteneur.innerHTML = `
            <h3>Suggestions pour vous :</h3>
            <div class="suggestions-container">
                ${suggestions.map(s => {
            const image = s.images?.[0] || 'https://via.placeholder.com/100';
            return `
                        <div class="suggestion-item" onclick="afficherDetailsProduit(${s.id})">
                            <img src="${image}" alt="${s.nom}" onerror="this.src='https://via.placeholder.com/100'">
                            <p>${s.nom}</p>
                            <p>${s.prix.toLocaleString()} FCFA</p>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    } else {
        conteneur.innerHTML = '';
    }
}

// ========== RECHERCHE ==========
function initialiserRecherche() {
    const rechercheInput = document.getElementById('recherche');
    if (rechercheInput) {
        rechercheInput.addEventListener('input', (e) => {
            const terme = e.target.value.toLowerCase();
            const produitsFiltres = catalogueProduits.filter(produit =>
                produit.nom.toLowerCase().includes(terme) ||
                (produit.description || '').toLowerCase().includes(terme) ||
                (produit.marque || '').toLowerCase().includes(terme)
            );
            afficherProduits(produitsFiltres);
        });
    }
}

// ========== COMPTEURS ==========
function mettreAJourCompteurs() {
    const compteurFavoris = document.getElementById('compteur-favoris');
    const compteurComparaison = document.getElementById('compteur-comparaison');

    if (compteurFavoris) {
        compteurFavoris.textContent = favoris.length;
        compteurFavoris.style.display = favoris.length > 0 ? 'inline' : 'none';
    }

    if (compteurComparaison) {
        compteurComparaison.textContent = comparaison.length;
        compteurComparaison.style.display = comparaison.length > 0 ? 'inline' : 'none';
    }
}

// ========== NOTIFICATIONS ==========
function afficherNotification(message, type = "success") {
    const anciennesNotifications = document.querySelectorAll('.notification');
    anciennesNotifications.forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === "success" ? "#27ae60" : "#e74c3c"};
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        animation: slideIn 0.3s ease;
        z-index: 9999;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ========== MENU MOBILE ==========
function initMobileMenu() {
    if (document.querySelector('.menu-mobile')) return;

    const menuHTML = `
        <div class="menu-mobile">
            <a href="index.html" class="menu-mobile-item" onclick="document.getElementById('liste-produits').scrollIntoView({behavior: 'smooth'}); return false;">
                <span>🏠</span>
                <span>Accueil</span>
            </a>
            <a href="panier.html" class="menu-mobile-item" onclick="document.getElementById('panier').scrollIntoView({behavior: 'smooth'}); return false;">
                <span>🛒</span>
                <span>Panier</span>
            </a>
            <a href="index.html#modalFavoris" class="menu-mobile-item" onclick="afficherFavorisPopin(); return false;">
                <span>❤️</span>
                <span>Favoris</span>
            </a>
            <a href="index.html#modalComparaison" class="menu-mobile-item" onclick="afficherComparaisonPopin(); return false;">
                <span>⇄</span>
                <span>Comparer</span>
            </a>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', menuHTML);
}

// ========== FONCTIONS POUR LES MODALS ==========
function afficherFavorisPopin() {
    const modal = document.getElementById('modalFavoris');
    if (modal) {
        afficherFavoris();
        modal.style.display = "block";
    }
}

function afficherComparaisonPopin() {
    const modal = document.getElementById('modalComparaison');
    if (modal) {
        afficherComparaison();
        modal.style.display = "block";
    }
}

function afficherDetailsProduit(produitId) {
    const produit = catalogueProduits.find(p => p.id == produitId);
    if (!produit) return;

    const modal = document.getElementById('modalDetails');
    const contenu = document.getElementById('detailsContenu');

    if (!modal || !contenu) return;

    const images = produit.images && produit.images.length > 0
        ? produit.images
        : ['https://via.placeholder.com/300'];
    const imagePrincipale = images[0];

    const pourcentagePromo = produit.promo && produit.prixOriginal > produit.prix
        ? Math.round((1 - produit.prix / produit.prixOriginal) * 100)
        : 0;

    contenu.innerHTML = `
        <div class="details-container">
            <div class="details-images">
                <img src="${imagePrincipale}" alt="${produit.nom}" class="details-image-principale" id="detailsMainImage" onerror="this.src='https://via.placeholder.com/300'">
                ${images.length > 1 ? `
                    <div class="details-miniatures">
                        ${images.map(img => `
                            <img src="${img}" alt="${produit.nom}" onclick="document.getElementById('detailsMainImage').src='${img}'" onerror="this.src='https://via.placeholder.com/80'">
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="details-info">
                <h2>${produit.nom}</h2>
                <div class="note-produit">${genererEtoiles(produit.note || 4.5)} (${produit.avis || 0} avis)</div>
                <p class="description">${produit.description || ''}</p>
                <p class="marque">Marque: ${produit.marque || 'Générique'}</p>
                <p class="stock ${produit.stock < 5 ? 'stock-faible' : 'stock-normal'}">
                    Stock: ${produit.stock <= 0 ? 'Rupture' : produit.stock + ' unités'}
                </p>
                <p class="prix">Prix: ${produit.prix.toLocaleString()} FCFA</p>
                ${produit.promo && pourcentagePromo > 0 ? `
                    <p class="promo">En promotion: -${pourcentagePromo}% (était ${produit.prixOriginal.toLocaleString()} FCFA)</p>
                ` : ''}
                
                <button onclick="ajouterAuPanier('${produit.nom}', ${produit.prix}, '${imagePrincipale}', ${produit.id})" 
                    class="btn-acheter" ${produit.stock <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                    🛒 ${produit.stock <= 0 ? 'Rupture de stock' : 'Ajouter au panier'}
                </button>
            </div>
        </div>
    `;

    modal.style.display = "block";
}

// ========== WHATSAPP ==========
function commanderWhatsApp() {
    if (panier.length === 0) {
        alert("Votre panier est vide !");
        return;
    }

    const monNumero = "22897232547";

    let texte = "🛍️ *NOUVELLE COMMANDE* 🛍️\n\n";
    let totalCommande = 0;

    panier.forEach(item => {
        const sousTotal = item.prix * item.quantite;
        totalCommande += sousTotal;
        texte += `✅ *${item.nom}*\n`;
        texte += `   Quantité: ${item.quantite}\n`;
        texte += `   Prix unitaire: ${item.prix.toLocaleString()} FCFA\n`;
        texte += `   Sous-total: ${sousTotal.toLocaleString()} FCFA\n\n`;
    });

    texte += `💰 *TOTAL GÉNÉRAL : ${totalCommande.toLocaleString()} FCFA*\n\n`;
    texte += "Merci de confirmer ma commande 🙏";

    const messageFinal = encodeURIComponent(texte);
    window.open(`https://wa.me/${monNumero}?text=${messageFinal}`, '_blank');
}

// ========== FONCTIONS GLOBALES POUR INDEX.HTML ==========
window.filtrerProduits = function (categorie) {
    const boutons = document.querySelectorAll('.btn-filtre');
    boutons.forEach(btn => btn.classList.remove('active'));

    const boutonClique = Array.from(boutons).find(btn =>
        btn.textContent.toLowerCase().includes(categorie === 'tous' ? 'tous' :
            categorie === 'cosmetique' ? 'cosmétique' :
                categorie === 'electronique' ? 'électronique' : 'promo')
    );
    if (boutonClique) boutonClique.classList.add('active');

    if (!catalogueProduits || catalogueProduits.length === 0) {
        console.log('Produits pas encore chargés...');
        setTimeout(() => window.filtrerProduits(categorie), 500);
        return;
    }

    let produitsFiltres;
    if (categorie === 'tous') {
        produitsFiltres = catalogueProduits;
    } else if (categorie === 'promo') {
        produitsFiltres = catalogueProduits.filter(p => p.promo);
    } else {
        produitsFiltres = catalogueProduits.filter(p => p.categorie === categorie);
    }

    afficherProduits(produitsFiltres);
};

// Exposer toutes les fonctions nécessaires
window.afficherProduits = afficherProduits;
window.afficherFavoris = afficherFavoris;
window.afficherComparaison = afficherComparaison;
window.chargerProduitsJSON = chargerProduitsJSON;
window.ouvrirZoom = ouvrirZoom;
window.fermerZoom = fermerZoom;
window.ajouterAuPanier = ajouterAuPanier;
window.commanderWhatsApp = commanderWhatsApp;
window.toggleFavori = toggleFavori;
window.toggleComparaison = toggleComparaison;
window.afficherDetailsProduit = afficherDetailsProduit;
window.modifierQuantite = modifierQuantite;
window.supprimerArticle = supprimerArticle;