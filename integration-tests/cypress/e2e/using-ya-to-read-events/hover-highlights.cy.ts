import * as tinycolor2 from "tinycolor2"
import {
  darkBackgroundColors,
  isHovered,
  isNotHovered,
  lightBackgroundColors,
} from "./hover-utils"
import { startNeovimWithYa } from "./startNeovimWithYa"

describe("highlighting the buffer with 'hover' events", () => {
  beforeEach(() => {
    cy.visit("http://localhost:5173")
  })

  // NOTE: when opening the file, the cursor is placed at the beginning of
  // the file. This causes the web terminal to render multiple elements for the
  // same text, and this can cause issues when matching colors, as in the DOM
  // there really are multiple colors present. Work around this by matching a
  // substring of the text instead of the whole text.

  /** HACK in CI, there can be timing issues where the first hover event is
   * lost. Right now we work around this by selecting another file first, then
   * hovering the desired file.
   */
  function hoverAnotherFileToEnsureHoverEventIsReceivedInCI(file: string) {
    // select another file (hacky)
    cy.typeIntoTerminal("gg")

    // select the desired file so that a new hover event is sent
    cy.typeIntoTerminal(`/${file}{enter}`)
  }

  it("can highlight the buffer when hovered", () => {
    startNeovimWithYa({
      startupScriptModifications: [
        "modify_yazi_config_and_add_hovered_buffer_background.lua",
      ],
    }).then((dir) => {
      // wait until text on the start screen is visible
      isNotHovered("f you see this text, Neovim is ready!")

      // start yazi
      cy.typeIntoTerminal("{upArrow}")

      hoverAnotherFileToEnsureHoverEventIsReceivedInCI(
        dir.contents["initial-file.txt"].name,
      )

      // yazi is shown and adjacent files should be visible now
      //
      // the current file is highlighted by default when
      // opening yazi. This should have sent the 'hover' event and caused the
      // Neovim window to be shown with a different background color
      isHovered("If you see this text, Neovim is ready!")

      // close yazi - the highlight should be removed and we should see the
      // same color as before
      cy.typeIntoTerminal("q")
      isNotHovered("f you see this text, Neovim is ready!")
    })
  })

  it("can remove the highlight when the cursor is moved away", () => {
    startNeovimWithYa({
      startupScriptModifications: [
        "modify_yazi_config_and_add_hovered_buffer_background.lua",
      ],
    }).then((dir) => {
      // wait until text on the start screen is visible
      isNotHovered("f you see this text, Neovim is ready!")

      // start yazi
      cy.typeIntoTerminal("{upArrow}")

      // yazi is shown and adjacent files should be visible now
      cy.contains(dir.contents["test-setup.lua"].name)

      hoverAnotherFileToEnsureHoverEventIsReceivedInCI(
        dir.contents["initial-file.txt"].name,
      )

      // the current file is highlighted by default when
      // opening yazi. This should have sent the 'hover' event and caused the
      // Neovim window to be shown with a different background color
      isHovered("If you see this text, Neovim is ready!")

      // hover another file - the highlight should be removed
      cy.typeIntoTerminal(`/^${dir.contents["test-setup.lua"].name}{enter}`)

      isNotHovered("If you see this text, Neovim is ready!")
    })
  })

  it("can move the highlight to another buffer when hovering over it", () => {
    startNeovimWithYa({
      startupScriptModifications: [
        "modify_yazi_config_and_add_hovered_buffer_background.lua",
      ],
    }).then((dir) => {
      // wait until text on the start screen is visible
      isNotHovered("f you see this text, Neovim is ready!")

      const testFile = dir.contents["test-setup.lua"].name
      // open an adjacent file and wait for it to be displayed
      cy.typeIntoTerminal(
        `:vsplit ${dir.rootPathAbsolute}/${testFile}{enter}`,
        {
          delay: 1,
        },
      )
      cy.contains("how to initialize the test environment")

      // start yazi - the initial file should be highlighted
      cy.typeIntoTerminal("{upArrow}")

      hoverAnotherFileToEnsureHoverEventIsReceivedInCI(testFile)
      isHovered("how to initialize the test environment")

      // select the other file - the highlight should move to it
      cy.typeIntoTerminal(`/^${dir.contents["initial-file.txt"].name}{enter}`, {
        delay: 1,
      })
      isNotHovered("how to initialize the test environment")
      isHovered("If you see this text, Neovim is ready!")
    })
  })

  describe("default colors", () => {
    // If the user hasn't specified a custom highlight color, yazi.nvim will
    // create a default color for them. The default colors are created based on
    // the current colorscheme - by darkening or lightening an existing color.
    //
    it("for a dark colorscheme, hovers appear lighter in color", () => {
      startNeovimWithYa({ startupScriptModifications: [] }).then((dir) => {
        // wait until text on the start screen is visible
        isNotHovered("f you see this text, Neovim is ready!")

        // start yazi
        cy.typeIntoTerminal("{upArrow}")

        hoverAnotherFileToEnsureHoverEventIsReceivedInCI(
          dir.contents["test-setup.lua"].name,
        )

        // yazi is shown and adjacent files should be visible now
        //
        // highlight the initial file
        cy.typeIntoTerminal(`/${dir.contents["initial-file.txt"].name}{enter}`)
        cy.contains("Error").should("not.exist")

        // the background color should be different from the default color
        cy.contains("If you see this text, Neovim is ready!")
          .should("have.css", "background-color")
          .should((color) => {
            expect(tinycolor2(color).getLuminance()).to.be.greaterThan(
              tinycolor2(darkBackgroundColors.normal).getLuminance(),
            )
          })
      })
    })

    it("for a light colorscheme", () => {
      startNeovimWithYa({
        startupScriptModifications: ["use_light_neovim_colorscheme.lua"],
      }).then((dir) => {
        // wait until text on the start screen is visible
        cy.contains("If you see this text, Neovim is ready!")
          .children()
          .should("have.css", "background-color", lightBackgroundColors.normal)

        // start yazi
        cy.typeIntoTerminal("{upArrow}")

        hoverAnotherFileToEnsureHoverEventIsReceivedInCI(
          dir.contents["test-setup.lua"].name,
        )

        // yazi is shown and adjacent files should be visible now
        //
        // highlight the initial file
        cy.typeIntoTerminal(`/${dir.contents["initial-file.txt"].name}{enter}`)
        cy.contains("Error").should("not.exist")

        // the background color should be different from the default color
        cy.contains("If you see this text, Neovim is ready!")
          .should("have.css", "background-color")
          .should((color) => {
            expect(tinycolor2(color).getLuminance()).to.be.lessThan(
              tinycolor2(lightBackgroundColors.normal).getLuminance(),
            )
          })
      })
    })
  })
})
